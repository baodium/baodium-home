package main

import (
	"encoding/json"
	"testing"
)

func TestCountStatuses(t *testing.T) {
	source := `package solution

func CountStatuses(records any) any {
	rows, _ := records.([]any)
	counts := map[string]int{}
	for _, row := range rows {
		item, _ := row.(map[string]any)
		status := int(item["status"].(float64))
		class := string(rune('0'+status/100)) + "xx"
		counts[class]++
	}
	if len(counts) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range counts {
		out[key] = value
	}
	return out
}
`
	params := []paramSpec{{Name: "records"}}
	cases := []caseSpec{
		{
			ID: "mixed", Title: "Mixed responses",
			Kwargs: map[string]json.RawMessage{
				"records": json.RawMessage(`[{"status":200},{"status":204},{"status":503}]`),
			},
			Expected: json.RawMessage(`{"2xx":2,"5xx":1}`),
		},
		{
			ID: "empty", Title: "No traffic",
			Kwargs:   map[string]json.RawMessage{"records": json.RawMessage(`[]`)},
			Expected: json.RawMessage(`{}`),
		},
	}
	got, err := execute(source, "CountStatuses", params, cases)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Results) != 2 || !got.Results[0].Passed || !got.Results[1].Passed {
		t.Fatalf("%+v", got.Results)
	}
}

func TestRejectsMutation(t *testing.T) {
	source := `package solution

func CountStatuses(records any) any {
	rows, _ := records.([]any)
	if len(rows) > 0 {
		item := rows[0].(map[string]any)
		item["status"] = 500.0
	}
	return map[string]any{}
}
`
	got, err := execute(source, "CountStatuses", []paramSpec{{Name: "records"}}, []caseSpec{{
		ID: "mutate", Title: "Do not edit the input",
		Kwargs:   map[string]json.RawMessage{"records": json.RawMessage(`[{"status":200}]`)},
		Expected: json.RawMessage(`{}`),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if got.Results[0].Passed || got.Results[0].Detail != "Input was modified." {
		t.Fatalf("%+v", got.Results[0])
	}
}
