import type { ReviewRule } from './types';

/**
 * Best-practice review by the senior architect. Works on the player's SQL text and result columns.
 * Review notes never fail a mission; a clean review earns a bonus.
 */

export interface ReviewNote {
  rule: ReviewRule;
  text: string;
}

/** Removes comments and string literals so rules only look at code. */
function codeOnly(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
}

const RULES: Record<ReviewRule, (sql: string, columns: string[]) => string | null> = {
  no_select_star: (sql) =>
    /\bselect\s+(distinct\s+)?\*/i.test(codeOnly(sql))
      ? 'You used SELECT *. Fine for a quick look, but a query others rely on should name its columns. Then a new source column cannot change your result.'
      : null,

  alias_aggregates: (_sql, columns) => {
    const unnamed = columns.filter((c) => c.includes('('));
    return unnamed.length
      ? `The column ${unnamed.map((c) => `"${c}"`).join(', ')} has no name. Give calculated columns an alias with AS, for example COUNT(*) AS CONTRACTS. Later the alias becomes the measure name in the model.`
      : null;
  },

  explicit_join: (sql) =>
    /\bfrom\s+[\w."]+(\s+(as\s+)?\w+)?\s*,\s*[\w."]+/i.test(codeOnly(sql))
      ? 'You joined with a comma in FROM. Write JOIN … ON … instead: the join condition is then next to the join, and a forgotten condition cannot silently multiply rows.'
      : null,

  no_logic_in_inbound: (sql) =>
    /\bcreate\s+(or\s+replace\s+)?view\s+"?RHN_IN"?\./i.test(codeOnly(sql))
      ? 'This view sits in RHN_IN. The inbound layer holds source data 1:1; business logic belongs in RHN_HARM.'
      : null,
};

export function review(sql: string, columns: string[], rules: ReviewRule[] = []): ReviewNote[] {
  return rules.flatMap((rule) => {
    const text = RULES[rule](sql, columns);
    return text ? [{ rule, text }] : [];
  });
}
