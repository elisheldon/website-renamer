import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine;
const inputField = document.getElementById('inputField');
const submitButton = document.getElementById('submitButton');

const messages = [
    { role: "system",
        content: `
        You are an expert web developer helping the user change the website they are currently visiting.
        
        Each message will be a JSON object of the form:
        {
            "instructions": The user's instructions for what to change,
            "html": The current HTML code for the webpage,
            "css": The current CSS code for the webpage
        }
        
        Your response must be a JSON object of the form:
        {
            "html": The new complete HTML code for the webpage based on the requested changes,
            "css": The new complete CSS code for the webpage based on the requested changes
        }

        Do not return anything else.
        `
    },
];

// Load model and initialize LLM engine
async function loadModel() {
    const selectedModel = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC"
    // const selectedModel = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
    try {
        console.log('Loading ' + selectedModel);
        engine = await webllm.CreateMLCEngine(
            selectedModel
        );
        console.log('Model loaded.');
    } catch (error) {
        console.error('Failed to load model:', error);
    }
}

// Enable input and button after the model is loaded
async function initializeApp() {
    inputField.disabled = true;
    submitButton.disabled = true;

    await loadModel();

    inputField.placeholder = "Enter text here...";
    inputField.disabled = false;
    submitButton.disabled = false;
}

// Initialize the app
initializeApp();

function getCSS() {
    let cssText = "";
    // Loop through all stylesheets in the document
    for (let sheet of document.styleSheets) {
        try {
            for (let rule of sheet.cssRules) {
                cssText += rule.cssText;
            }
        } catch (error) {
            console.warn("Couldn't read CSS rules.");
        }
    }
    return cssText;
}

// Function to generate a response from the AI model
async function generateResponse() {
    let response;

    inputField.disabled = true;
    submitButton.disabled = true;

    const userInput = inputField.value.trim();
    const userJson = {
        instructions: userInput,
        html: document.documentElement.outerHTML,
        css: getCSS()
    };
    messages.push({ role: 'user', content: JSON.stringify(userJson)});

    if (userInput) {
        inputField.value = 'Working...';
        try {
            // Generate response using Web-LLM
            const reply = await engine.chat.completions.create({
                messages,
                temperature: 0.4
            });
            console.log(reply)
            response = reply.choices[0].message.content;
            messages.push({ role: 'assistant', content: response});
        } catch (error) {
            console.error('Error generating response:', error);
        }
        inputField.value = '';
        inputField.disabled = false;
        submitButton.disabled = false;
        return response;
    }
}

function cleanJsonString(jsonString) {
    const pattern = /^```json\s*(.*?)\s*```$/s;
    const cleanedString = jsonString.replace(pattern, '$1');
    return cleanedString.trim();
}

function applyChanges(response) {
    let code;
    
    // Parse the JSON response
    try{
        code = JSON.parse(cleanJsonString(response));
        console.log(code);
    } catch (error) {
        console.error('Error parsing JSON response:', error);
        return;
    }

    // Apply changes to the webpage
    const newHtml = code.html;
    const newCss = code.css;

    // Update the HTML and CSS of the webpage
    document.documentElement.innerHTML = newHtml;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = newCss;
    document.head.appendChild(styleSheet);
}

// Event listener to handle user message submission
submitButton.addEventListener('click', async () => {
    const response = await generateResponse();
    if (response) {
        applyChanges(response);
    }
});

// Allow pressing Enter to send messages
inputField.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        submitButton.click();
    }
});