//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"
)

func main() {
	js.Global().Set("sreRunGo", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 4 {
			return js.ValueOf(`{"error":"The Go runner received an incomplete request."}`)
		}
		var params []paramSpec
		var cases []caseSpec
		if err := json.Unmarshal([]byte(args[2].String()), &params); err != nil {
			return js.ValueOf(`{"error":"The Go runner could not read the signature."}`)
		}
		if err := json.Unmarshal([]byte(args[3].String()), &cases); err != nil {
			return js.ValueOf(`{"error":"The Go runner could not read the checks."}`)
		}
		result, err := execute(args[0].String(), args[1].String(), params, cases)
		if err != nil {
			payload, _ := json.Marshal(map[string]string{"error": err.Error()})
			return js.ValueOf(string(payload))
		}
		payload, _ := json.Marshal(result)
		return js.ValueOf(string(payload))
	}))
	select {}
}
