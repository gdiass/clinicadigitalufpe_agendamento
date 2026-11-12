// Bloqueia o merge de MRs sem aprovação de alguém diferente do autor.
// O GitLab CE não tem regras de aprovação obrigatórias; como o projeto exige
// pipeline verde para mergear, este job falhando impede o merge.
// Após aprovar, rode novamente o job "require-approval" no pipeline do MR.

const {
  CI_API_V4_URL: apiUrl,
  CI_PROJECT_ID: projectId,
  CI_MERGE_REQUEST_IID: mrIid,
  MR_APPROVAL_TOKEN: token,
} = process.env;

if (!mrIid) {
  console.error('[require-approval] Este job só roda em pipelines de merge request.');
  process.exit(1);
}

if (!token) {
  console.error('[require-approval] Variável MR_APPROVAL_TOKEN não configurada (Settings > CI/CD > Variables).');
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`${apiUrl}/projects/${projectId}/merge_requests/${mrIid}${path}`, {
    headers: { 'PRIVATE-TOKEN': token },
  });
  if (!res.ok) {
    throw new Error(`GET ${path || '/'} -> HTTP ${res.status}`);
  }
  return res.json();
}

const [mr, approvals] = await Promise.all([get(''), get('/approvals')]);

const author = mr.author.username;
const approvers = (approvals.approved_by ?? [])
  .map(({ user }) => user.username)
  .filter((username) => username !== author);

if (approvers.length === 0) {
  console.error(`[require-approval] MR !${mrIid} ainda não foi aprovado por alguém além do autor (@${author}).`);
  console.error('[require-approval] Peça uma revisão; após a aprovação, rode este job novamente (Retry).');
  process.exit(1);
}

console.log(`[require-approval] ✓ MR !${mrIid} aprovado por: ${approvers.map((u) => `@${u}`).join(', ')}`);
