import fs from "fs";

const spec = JSON.parse(fs.readFileSync("openapi.json", "utf8"));

function deref(obj, seen = new Set()) {
  if (!obj || typeof obj !== "object") return obj;
  if (obj.$ref) {
    if (seen.has(obj.$ref)) return { circular: obj.$ref };
    seen.add(obj.$ref);
    const parts = obj.$ref.replace(/^#\//, "").split("/");
    let cur = spec;
    for (const p of parts) cur = cur[p];
    return deref(cur, seen);
  }
  if (Array.isArray(obj)) return obj.map((x) => deref(x, new Set(seen)));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      [
        "example",
        "examples",
        "description",
        "title",
        "x-speakeasy-name-override",
        "x-codeSamples",
      ].includes(k)
    ) {
      continue;
    }
    out[k] = deref(v, seen);
  }
  return out;
}

function shape(schema, depth = 0) {
  if (!schema || depth > 5) return schema?.type || "deep";
  schema = deref(schema);
  if (schema.allOf) return { allOf: schema.allOf.map((s) => shape(s, depth + 1)) };
  if (schema.oneOf) return { oneOf: schema.oneOf.map((s) => shape(s, depth + 1)) };
  if (schema.anyOf) return { anyOf: schema.anyOf.map((s) => shape(s, depth + 1)) };
  const r = { type: schema.type };
  if (schema.enum) r.enum = schema.enum;
  if (schema.format) r.format = schema.format;
  if (schema.nullable) r.nullable = true;
  if (schema.required) r.required = schema.required;
  if (schema.minimum !== undefined) r.minimum = schema.minimum;
  if (schema.maximum !== undefined) r.maximum = schema.maximum;
  if (schema.minLength !== undefined) r.minLength = schema.minLength;
  if (schema.maxLength !== undefined) r.maxLength = schema.maxLength;
  if (schema.minItems !== undefined) r.minItems = schema.minItems;
  if (schema.properties) {
    r.properties = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      r.properties[k] = shape(v, depth + 1);
    }
  }
  if (schema.items) r.items = shape(schema.items, depth + 1);
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    r.additionalProperties = shape(schema.additionalProperties, depth + 1);
  }
  return r;
}

const prefixes = [
  "/workspaces",
  "/byok",
  "/guardrails",
  "/analytics",
  "/organization",
  "/observability",
  "/external-users",
  "/private-",
  "/scim",
  "/presets",
  "/generation/feedback",
  "/activity",
  "/credits",
  "/keys",
];

const targets = Object.keys(spec.paths).filter((p) =>
  prefixes.some((pre) => p === pre || p.startsWith(pre)),
);

const out = {};
for (const p of targets) {
  for (const m of Object.keys(spec.paths[p])) {
    const op = spec.paths[p][m];
    if (!op?.operationId) continue;
    const desc = `${op.description || ""} ${op.summary || ""}`;
    if (!/management key|Management key|Only management/i.test(desc) && m !== "get") {
      // keep all for these paths — management page listed them
    }
    const entry = {
      operationId: op.operationId,
      summary: op.summary,
      description: (op.description || "").slice(0, 300),
    };
    if (op.parameters) {
      entry.params = op.parameters.map((pr) => {
        const d = deref(pr);
        return {
          in: d.in,
          name: d.name,
          required: !!d.required,
          schema: shape(d.schema),
        };
      });
    }
    const rb = op.requestBody?.content?.["application/json"]?.schema;
    if (rb) entry.body = shape(rb);
    out[`${m.toUpperCase()} ${p}`] = entry;
  }
}

fs.writeFileSync("mgmt-shapes.json", JSON.stringify(out, null, 2));
console.log("ops", Object.keys(out).length, "bytes", fs.statSync("mgmt-shapes.json").size);
