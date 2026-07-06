export function getPagination(query: { skip?: number; take?: number }) {
  const skip = query.skip ?? 0;
  const take = Math.min(query.take ?? 25, 100);

  return { skip, take };
}

export function textSearch(search: string | undefined, fields: string[]) {
  if (!search?.trim()) {
    return undefined;
  }

  return fields.map((field) => ({
    [field]: { contains: search.trim(), mode: "insensitive" as const },
  }));
}
