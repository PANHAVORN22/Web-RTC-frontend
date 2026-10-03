/** Extract API parameters from a GitHub repository link, never from an arbitrary host. */
export function parseGitHubRepositoryUrl(input: string): {
  repositoryOwner: string;
  repositoryName: string;
} | null {
  const value = input.trim();
  try {
    const url = new URL(
      /^(?:www\.)?github\.com\//i.test(value) ? `https://${value}` : value
    );
    if (
      url.protocol !== "https:" ||
      !["github.com", "www.github.com"].includes(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const match = url.pathname.match(/^\/([a-z0-9-]+)\/([a-z0-9._-]+)\/?$/i);
    if (!match) return null;
    const repositoryName = match[2].replace(/\.git$/i, "");
    if (!repositoryName || repositoryName === "." || repositoryName === "..")
      return null;
    return { repositoryOwner: match[1], repositoryName };
  } catch {
    return null;
  }
}
