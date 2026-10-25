-- Pandoc Lua filter: style fenced divs from preprocess-latex.mjs

local env_classes = {
  decision = "book-decision",
  fieldnote = "book-fieldnote",
  hiddenassumptions = "book-hiddenassumptions",
}

function Div(div)
  if div.classes and #div.classes > 0 then
    local key = div.classes[1]
    local mapped = env_classes[key]
    if mapped then
      div.classes = { mapped }
      div.attributes = div.attributes or {}
      div.attributes["role"] = "note"
      if key == "decision" then
        div.attributes["data-callout"] = "decision"
      end
    end
  end
  return div
end

function Image(img)
  img.attributes = img.attributes or {}
  img.attributes["loading"] = "lazy"
  img.attributes["data-zoomable"] = "true"
  return img
end
