package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/traefik/yaegi/interp"
)

type paramSpec struct {
	Name       string          `json:"name"`
	HasDefault bool            `json:"hasDefault"`
	Default    json.RawMessage `json:"default,omitempty"`
}

type caseSpec struct {
	ID       string                     `json:"id"`
	Title    string                     `json:"title"`
	Kwargs   map[string]json.RawMessage `json:"kwargs"`
	Expected json.RawMessage            `json:"expected"`
}

type testResult struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Passed bool   `json:"passed"`
	Detail string `json:"detail"`
}

type runOutput struct {
	Results []testResult `json:"results"`
	Output  string       `json:"output"`
}

var ident = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

func execute(source, entry string, params []paramSpec, cases []caseSpec) (runOutput, error) {
	if len(source) > 50000 {
		return runOutput{}, fmt.Errorf("keep the solution under 50,000 characters")
	}
	if !ident.MatchString(entry) {
		return runOutput{}, fmt.Errorf("the function name is not a Go identifier")
	}
	if !strings.Contains(source, "package solution") {
		return runOutput{}, fmt.Errorf("start the file with package solution and define %s", entry)
	}
	for _, line := range strings.Split(source, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "import ") || trimmed == "import (" {
			return runOutput{}, fmt.Errorf("this runtime has no imports; keep helpers in package solution")
		}
	}
	engine := interp.New(interp.Options{})
	if _, err := engine.Eval(source); err != nil {
		return runOutput{}, cleanError(err)
	}
	symbol, err := engine.Eval("solution." + entry)
	if err != nil {
		return runOutput{}, fmt.Errorf("define func %s in package solution", entry)
	}
	fn := symbol
	if fn.Kind() == reflect.Interface && !fn.IsNil() {
		fn = fn.Elem()
	}
	if !fn.IsValid() || fn.Kind() != reflect.Func {
		return runOutput{}, fmt.Errorf("define func %s in package solution", entry)
	}
	if fn.Type().NumIn() != len(params) {
		return runOutput{}, fmt.Errorf("%s must take %d argument(s), in the order shown in the signature", entry, len(params))
	}
	out := runOutput{Results: make([]testResult, 0, len(cases))}
	for _, item := range cases {
		out.Results = append(out.Results, runCase(fn, params, item))
	}
	return out, nil
}

func runCase(fn reflect.Value, params []paramSpec, item caseSpec) (result testResult) {
	result = testResult{ID: item.ID, Title: item.Title}
	defer func() {
		if recovered := recover(); recovered != nil {
			result.Passed = false
			result.Detail = clip(fmt.Sprint(recovered), 700)
		}
	}()
	decoded := map[string]any{}
	for key, raw := range item.Kwargs {
		value, err := decode(raw)
		if err != nil {
			result.Detail = "Could not read the test input."
			return
		}
		decoded[key] = value
	}
	before, _ := json.Marshal(decoded)
	args := make([]reflect.Value, len(params))
	for index, param := range params {
		value, ok := decoded[param.Name]
		if !ok && param.HasDefault {
			fallback, err := decode(param.Default)
			if err != nil {
				result.Detail = "Could not read the default for " + param.Name + "."
				return
			}
			value = fallback
			ok = true
		}
		if !ok {
			value = nil
		}
		args[index] = anyValue(value)
	}
	returned := fn.Call(args)
	after, _ := json.Marshal(decoded)
	if !bytes.Equal(before, after) {
		result.Detail = "Input was modified."
		return
	}
	if len(returned) == 0 {
		result.Detail = "The function did not return a value."
		return
	}
	actual, err := decodeValue(returned[0])
	if err != nil {
		result.Detail = clip(err.Error(), 700)
		return
	}
	expected, err := decode(item.Expected)
	if err != nil {
		result.Detail = "Could not read the expected value."
		return
	}
	got, _ := json.Marshal(actual)
	want, _ := json.Marshal(expected)
	if bytes.Equal(got, want) {
		result.Passed = true
		result.Detail = "Passed."
		return
	}
	result.Detail = clip("Expected "+string(want)+"; received "+string(got), 700)
	return
}

func decode(raw json.RawMessage) (any, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	return value, nil
}

func decodeValue(value reflect.Value) (any, error) {
	if !value.IsValid() {
		return nil, nil
	}
	if value.Kind() == reflect.Interface || value.Kind() == reflect.Pointer {
		if value.IsNil() {
			return nil, nil
		}
		value = value.Elem()
	}
	payload, err := json.Marshal(value.Interface())
	if err != nil {
		return nil, err
	}
	return decode(payload)
}

func anyValue(value any) reflect.Value {
	if value == nil {
		return reflect.Zero(reflect.TypeOf((*any)(nil)).Elem())
	}
	return reflect.ValueOf(value)
}

func cleanError(err error) error {
	text := err.Error()
	if len(text) > 700 {
		text = text[len(text)-700:]
	}
	return fmt.Errorf("%s", text)
}

func clip(text string, limit int) string {
	if len(text) <= limit {
		return text
	}
	return text[:limit]
}
