/** Sends the browser to PayFast with the signed fields a payments server function returned. */
export function postToPayfast(action: string, fields: [string, string][]) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [k, v] of fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
