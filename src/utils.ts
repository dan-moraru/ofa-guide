export function formatResponse(response: string): string {
    // Replace **text** with bold Markdown syntax
    let formattedResponse = response.replace(/\*\*(.*?)\*\*/g, '**$1**');

    // Replace \n with actual newline character for line breaks
    formattedResponse = formattedResponse.replace(/\\n/g, '\n');

    return formattedResponse;
}