/**
 * Safely parse JSON string
 * @param {string} jsonStr - JSON string to parse
 * @returns {*} Parsed object or null
 */
export function safeParse(jsonStr) {
  var parsed = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    parsed = null;
  }
  return parsed;
}

/**
 * Parse JSON from AI response text
 * Tries multiple strategies: direct parse, markdown code blocks, JSON object, JSON array
 * @param {string} text - Text that may contain JSON
 * @returns {*} Parsed object/array or null
 */
export function parseJSON(text) {
  // Try direct parse
  var result = safeParse(text);
  if (result) return result;
  
  // Try markdown code block
  var jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    result = safeParse(jsonMatch[1].trim());
    if (result) return result;
  }
  
  // Try JSON object
  var objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    result = safeParse(objMatch[0]);
    if (result) return result;
  }
  
  // Try JSON array
  var arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    result = safeParse(arrMatch[0]);
    if (result) return result;
  }
  
  return null;
}

export default {
  safeParse,
  parseJSON
};
