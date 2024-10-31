import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine, inputField, submitButton, editableCode;

function initializeElements() {
    inputField = document.getElementById('in');
    submitButton = document.getElementById('sub');
    editableCode = document.getElementById('editable-code');
}

const messages = [
    { role: "system",
        content: `
        You are an expert web developer helping the user change the current website.
        
        Each user message will be a JSON object of the form:
        {
            "instructions": User's instructions for what to change,
            "html": Current body HTML code,
            "css": Current CSS code
        }
        
        Your response must be a JSON object of the form:
        {
            "html": New complete body HTML code based on the requested changes,
            "css": New complete CSS code based on the requested changes
        }

        Do not return anything else.
        `
    },
];

// Load model and initialize LLM engine
async function loadModel() {
    const selectedModel = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC"
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
    initializeElements();

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
    const cssTextCompressed = cssText.replace(/\s/g,'');
    return cssTextCompressed;
}

// Function to generate a response from the AI model
async function generateResponse() {
    let response;

    const userInput = inputField.value.trim();

    if (userInput) {
        const userJson = {
            instructions: userInput,
            html: editableCode.innerHTML,
            css: getCSS()
        };
        messages.push({ role: 'user', content: JSON.stringify(userJson)});
    
        console.log(userJson);
        inputField.value = 'Working...';
        inputField.disabled = true;
        submitButton.disabled = true;
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
    editableCode.innerHTML = newHtml;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = newCss;
    document.head.appendChild(styleSheet);

    initializeElements();
}

async function submitChanges(){
    console.log("Submitting change...")
    const response = await generateResponse();
    if (response) {
        applyChanges(response);
    }
}

// Event delegation on document level or a stable parent element
document.body.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'sub') { // checks for clicks on the submit button
        submitChanges();
    }
});

// Event delegation on document level for pressing Enter
document.body.addEventListener('keypress', (event) => {
    if (event.target && event.target.id === 'in' && event.key === 'Enter') { // checks if the input is focused and Enter is pressed
        submitChanges();
    }
});