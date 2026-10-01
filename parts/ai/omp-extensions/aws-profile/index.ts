import { applyBedrockProfile } from "./shared/profile.ts";

// Runs while OMP loads extensions: after it has read ~/.omp/agent/.env and
// before the first Bedrock request or agent shell command.
export default function awsProfile(): void {
  applyBedrockProfile(process.env);
}
