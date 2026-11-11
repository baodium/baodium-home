"""Verify every authored reference against fixed fixtures and input preservation."""
import copy
import json
from pathlib import Path

problems = json.loads(Path('src/lib/labs/coding-problems.json').read_text())
assert len({item['id'] for item in problems}) == len(problems) == 24
count = 0
for problem in problems:
    assert any(case['example'] for case in problem['cases'])
    assert any(not case['example'] for case in problem['cases'])
    namespace = {}
    exec(compile(problem['solution'], problem['id'], 'exec'), namespace)
    for case in problem['cases']:
        arguments = copy.deepcopy(case['kwargs'])
        original = copy.deepcopy(arguments)
        result = namespace[problem['entrypoint']](**arguments)
        assert result == case['expected'], (problem['id'], case['id'], result, case['expected'])
        assert arguments == original, (problem['id'], 'mutated input')
        count += 1
    starter = {}
    exec(compile(problem['starter'], problem['id'] + '-starter', 'exec'), starter)
    fails = 0
    for case in problem['cases']:
        try:
            arguments = copy.deepcopy(case['kwargs'])
            result = starter[problem['entrypoint']](**arguments)
            fails += result != case['expected'] or arguments != case['kwargs']
        except Exception:
            fails += 1
    assert fails > 0, (problem['id'], 'starter already passes every check')
print(f'{len(problems)} reference solutions passed {count} fixed checks without input mutation; every starter requires work.')
