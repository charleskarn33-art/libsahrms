const CATEGORICAL_SLOTS = 8;
export const OTHER_DEPARTMENT_COLOR = "var(--dept-other)";

/**
 * Assigns the fixed 8-slot categorical palette (see globals.css --dept-1..8) to
 * department names in the order given — never cycled. Anything past slot 8
 * folds into the shared "Other" color, same convention as the sidebar's
 * "Other Departments" bucket.
 */
export function buildDepartmentColorMap(orderedDepartmentNames: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  orderedDepartmentNames.forEach((name, i) => {
    map[name] = i < CATEGORICAL_SLOTS ? `var(--dept-${i + 1})` : OTHER_DEPARTMENT_COLOR;
  });
  return map;
}
