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
              text: `Extract every UK phone number from this image.
Return only phone numbers.
One phone number per line.
Do not include names.
Do not include explanations.
If there are no phone numbers, return an empty response.`,
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
