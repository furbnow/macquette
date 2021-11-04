# Plan for Macquette refactor

Date: 2021-11-02

- Fix abstraction boundaries as they currently are
  - Libraries <-> UI
  - UI <-> model (via global `p` object)
- Write acceptance tests on those boundaries
- Refactor modules internally
- Use existing customer data in shadow CI system (which exists on the `p` object boundary)

```
// ### Current implementation looks like:

const p = fetch(customer data)

// p: { name: ..., description: ..., modifiedAt: ..., data: { ... } }

let data = p.data.master
data = p.data['scenario 1']

for (const [key, val] of Object.entries(p.data)) {
  p.data[key] = model(val)
}

// ### Proposed acceptance tests:

const { data } = fetch(customer data)
// data: { master: ..., 'scenario 1': ... }
const expected = fetch(expected from somewhere)
// expected: { master: ... }

for (const scenarioName of union(keys of data, keys of masters)) {
  model(data[scenarioName]) // Mutates
  expect(data[scenarioName]).to.equal(expected[scenarioName])
}
```
