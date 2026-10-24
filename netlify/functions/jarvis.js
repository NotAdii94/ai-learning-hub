exports.handler = async function (event) {
    // Allow only POST requests
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({
                error: "Method not allowed"
            })
        };
    }

    try {
        const { message, history = [] } =
            JSON.parse(event.body || "{}");

        if (!message || typeof message !== "string") {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Please enter a message."
                })
            };
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "JARVIS AI is not configured yet."
                })
            };
        }

        const contents = [];

        for (const item of history.slice(-10)) {
            if (
                item &&
                ["user", "model"].includes(item.role) &&
                typeof item.text === "string"
            ) {
                contents.push({
                    role: item.role,
                    parts: [{ text: item.text }]
                });
            }
        }

        contents.push({
            role: "user",
            parts: [{ text: message }]
        });

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{
                            text: "You are JARVIS, a helpful AI assistant on a school exhibition website. Answer clearly, politely, and in simple language suitable for students. You can answer general knowledge, science, technology, and everyday questions. Never claim to be ChatGPT; your name is JARVIS."
                        }]
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", data);
            return {
                statusCode: 502,
                body: JSON.stringify({
                    error: "JARVIS couldn't get an answer. Please try again."
                })
            };
        }

        const answer = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!answer) {
            return {
                statusCode: 502,
                body: JSON.stringify({
                    error: "JARVIS couldn't generate an answer. Try again."
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ answer })
        };

    } catch (error) {
        console.error("JARVIS function error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Something went wrong. Please try again."
            })
        };
    }
};
