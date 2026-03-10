position yourself as an exprienced & seasoned software arcchitect with extensive experience in building agentic AI systems. you are employed to build a research cohort which essentially chat application where:
 - user can give an provide a topic  to research for
 - the system invokes a set of agents to research the topic, gather information, and synthesize findings into a coherent report.
 - we will use a modular architecture where different agents are responsible for specific tasks such as data collection, analysis, and report generation.
 - the system has an analyst agent who is an expert in data analysis and can evaluate the credibility of sources and the relevance of information and help identfy the better  response from the various agents and recommend the best one to the user.

To build this research cohort chat application, we will follow a modular architecture that allows for scalability and flexibility. Below is an outline of the components and their responsibilities:
- use gradio for the chat interface to allow users to interact with the system seamlessly.
- UI layout is a 3 column and three row grid where:
  - row 1: 
    - column 1: a display area for the first research agent's evaluation and recommendations.
    - column 2: a display area for the second research agent's evaluation and recommendations.
    - column 3: a display area for the third research agent's evaluation and recommendations.
  - row 2:
    - column 1-3: a display area for the analyst agent's insights and evaluations.
  - row 3:
    - column 1-3: a display area for the user to input their research topic and submit it for analysis.

system uses .env file to manage environment variables such as API keys, database credentials, and other configuration settings securely.
we support groq, huggingface, openrouter as the primary APIs for our agents to gather information and perform analysis. Each agent will be designed to interact with these APIs based on their specific tasks.
each agent would invoke different llms (language models) to perform their tasks effectively. For instance:
 - research agent one could use openai/gpt-oss-120b while research agent two could use google's gemini pro and research agent three could use meta's xlm-2.0. The analyst agent could use a combination of these models to evaluate the information gathered by the research agents.
To implement this research cohort chat application, we will follow these steps:
 - maintain a `config.json` to record the system propmpts, agent configurations, and API endpoints. 
 - keep api keys and sensitive information in a `.env` file to ensure security and ease of management.
 - develop the individual agents with their specific responsibilities and integrate them with the respective APIs.
 - design the gradio interface according to the specified layout and ensure that it can display the outputs from the agents effectively.
 - user should have an option to define the research topic and submit it for analysis, which will trigger the agents to perform their tasks and generate a report based on the findings.
 - implement a mechanism for the analyst agent to evaluate the outputs from the research agents and provide insights and recommendations to the user.
 - ensure that the system is modular and scalable, allowing for the addition of new agents or integration with new APIs in the future without significant changes to the existing architecture.
 - test the system thoroughly to ensure that it functions as expected and provides accurate and relevant information to the users based on their research topics.
 - use tools for sharing  response between agents and for the analyst agent to evaluate the responses effectively. This could involve using a shared database or an in-memory data structure to store and manage the information gathered by the research agents.

python is the primary programming language for this project, and we will use libraries such as `requests` for API interactions, `gradio` for the user interface, and `dotenv` for managing environment variables. We will also utilize appropriate libraries for data analysis and report generation as needed by the agents. Use the `openai` library to interact with the providers. for google  gemini and anthropic's claude, we will use their respective APIs to integrate them into our system.

python executable in the system runs in wsl, so we will ensure that all dependencies and configurations are compatible with the WSL environment. We will also set up a virtual environment to manage our Python dependencies effectively and avoid conflicts.
