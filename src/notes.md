
- Question: technically, how do we render alternative views over the doc?
  - maybe easy to do with slate on hover?
  - maybe avoid alternative views for now?
  - Decision: start with text-only
- Question: how do text-only views even work? What happens if you edit inside an annotation that is currently being transformed by a plugin?
  - We're not sure what's best. try two alternatives:
    - Transformed annotations aren't editable.
    - They are editable; if you start editing a transformed annotation, it reverts to the original text.
- Question: how should we associate parent and child annotation?
  - we agree that template functions aren't great
  - we think sub-annotations are better
  - arbitary relationships? vs. hierarchy
    - maybe hierarchy is default but you can also break out?

first steps on coding:
- start a codebase
- add a transform mechanism to update the displayed annotation
- add sub-ranges for quantities

ingredient.quantity // => look in the "quantity" sub-annotation and get the data

// arbitrary nested annotations
{
  id: "123",
  type: "ingredient",
  range: { start: 1, end: 10 },
  text: "3 eggs",
  data: { ... }
  subAnnotations: [
    {
      id: "456,
      type: "ingredient",
      propertyName: "quantity",
      range: { start: 1, end: 2 },
      text: "3",
      data: { quantity: 3 }
    },
    {
      ...
    }
  ]
}


// marked ranges
{
  id: "123",
  type: "ingredient",
  range: { start: 1, end: 10 },
  text: "3 eggs",
  data: {
    quantity: {
      value: 3,
      range: { start: 1, end: 2 }
    }
  }
}

