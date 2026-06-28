import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: `Extract every contact from this image.
For each contact, extract the name and phone number.
Return in format: NAME - NUMBER
One contact per line.
Example:
David Evans - 01633262674
Ecc Bricklaying - 07401067389
If there are no contacts, return an empty response.`,
            },
          ],
        },
      ],
    });

    const numbers = message.content
      .map((item) => (item.type === "text" ? item.text : ""))
      .join("\n")
      .trim();

    return Response.json({ numbers });
  } catch (error) {
    console.error("Claude error:", error);
    return Response.json(
      { error: error.message || "Failed to extract numbers" },
      { status: 500 }
    );
  }
}
