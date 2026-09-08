export type LiteratureHit = {
  sourceId: string;
  title: string;
  abstract?: string;
  doi?: string;
  pmid?: string;
  year?: number;
};

export async function searchEuropePmc(query: string, limit = 8): Promise<LiteratureHit[]> {
  const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('pageSize', String(Math.min(Math.max(limit, 1), 20)));
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Europe PMC search failed: HTTP ${response.status}`);
  const json = await response.json() as any;
  const results = json?.resultList?.result ?? [];
  return results.map((item: any) => ({
    sourceId: item.doi ? `doi:${item.doi}` : item.pmid ? `pmid:${item.pmid}` : `epmc:${item.id}`,
    title: item.title ?? '',
    abstract: item.abstractText,
    doi: item.doi,
    pmid: item.pmid,
    year: item.pubYear ? Number(item.pubYear) : undefined,
  })).filter((x: LiteratureHit) => x.title);
}
