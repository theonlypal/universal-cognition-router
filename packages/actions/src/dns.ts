interface CloudflareOptions {
  token: string;
  zoneId: string;
}

interface NamecheapOptions {
  apiUser: string;
  apiKey: string;
  clientIp: string;
  username?: string;
}

export async function createCloudflareRecord(opts: CloudflareOptions, record: { type: string; name: string; content: string; ttl?: number }) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${opts.zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.token}`
    },
    body: JSON.stringify({ ...record, ttl: record.ttl ?? 120 })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare error: ${response.status} ${body}`);
  }
  return response.json();
}

export async function createNamecheapRecord(opts: NamecheapOptions, domain: string, host: string, type: string, address: string) {
  const username = opts.username ?? opts.apiUser;
  const params = new URLSearchParams({
    ApiUser: opts.apiUser,
    ApiKey: opts.apiKey,
    UserName: username,
    ClientIp: opts.clientIp,
    Command: 'namecheap.domains.dns.setHosts',
    SLD: domain.split('.')[0],
    TLD: domain.split('.').slice(1).join('.'),
    'HostName1': host,
    'RecordType1': type,
    'Address1': address,
    'TTL1': '120'
  });
  const response = await fetch(`https://api.namecheap.com/xml.response?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Namecheap error: ${response.status} ${body}`);
  }
  return response.text();
}
