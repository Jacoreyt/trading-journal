import type Anthropic from "@anthropic-ai/sdk";

export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
