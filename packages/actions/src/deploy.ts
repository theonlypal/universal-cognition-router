interface VercelDeployOptions {
  token: string;
  projectId: string;
  teamId?: string;
  payload: Record<string, unknown>;
}

export async function triggerVercelDeploy(opts: VercelDeployOptions) {
  const query = new URLSearchParams();
  if (opts.teamId) {
    query.set('teamId', opts.teamId);
  }
  const response = await fetch(`https://api.vercel.com/v13/deployments?${query.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ...opts.payload, projectId: opts.projectId })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vercel deploy failed: ${response.status} ${text}`);
  }
  return response.json();
}
