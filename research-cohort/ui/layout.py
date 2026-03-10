import gradio as gr


def create_ui(run_research_fn):
    """Build and return the Gradio Blocks UI.

    Args:
        run_research_fn: async callable(topic) -> (alpha_md, beta_md, gamma_md, analyst_md)
    """
    with gr.Blocks(
        title="Research Cohort",
        theme=gr.themes.Soft(),
        css="""
            .agent-panel { min-height: 300px; }
            .analyst-panel { min-height: 200px; }
            #submit-btn { min-width: 120px; }
        """,
    ) as demo:
        gr.Markdown("# Research Cohort\nEnter a topic below to have 3 research agents investigate it in parallel. An analyst will synthesize their findings.")

        # Row 1: Research agent outputs
        with gr.Row():
            with gr.Column(elem_classes=["agent-panel"]):
                gr.Markdown("### Agent Alpha")
                alpha_status = gr.Markdown("*Waiting...*")
                alpha_out = gr.Markdown(elem_classes=["agent-panel"])

            with gr.Column(elem_classes=["agent-panel"]):
                gr.Markdown("### Agent Beta")
                beta_status = gr.Markdown("*Waiting...*")
                beta_out = gr.Markdown(elem_classes=["agent-panel"])

            with gr.Column(elem_classes=["agent-panel"]):
                gr.Markdown("### Agent Gamma")
                gamma_status = gr.Markdown("*Waiting...*")
                gamma_out = gr.Markdown(elem_classes=["agent-panel"])

        # Row 2: Analyst synthesis
        with gr.Row():
            with gr.Column(elem_classes=["analyst-panel"]):
                gr.Markdown("### Analyst Synthesis")
                analyst_status = gr.Markdown("*Waiting...*")
                analyst_out = gr.Markdown(elem_classes=["analyst-panel"])

        # Row 3: Input
        with gr.Row():
            topic_input = gr.Textbox(
                placeholder="Enter your research topic here...",
                label="Research Topic",
                scale=5,
            )
            submit_btn = gr.Button("Research", variant="primary", elem_id="submit-btn", scale=1)

        def set_researching():
            return (
                "*Researching...*",
                "*Researching...*",
                "*Researching...*",
                "*Researching...*",
                "", "", "", "",
            )

        async def on_submit(topic):
            if not topic or not topic.strip():
                yield (
                    "*Please enter a topic.*",
                    "*Please enter a topic.*",
                    "*Please enter a topic.*",
                    "*Please enter a topic.*",
                    "", "", "", "",
                )
                return

            # Show researching status
            yield (
                "*Researching...*",
                "*Researching...*",
                "*Researching...*",
                "*Waiting for research agents...*",
                "", "", "", "",
            )

            # Run research
            alpha_result, beta_result, gamma_result, analyst_result = await run_research_fn(topic.strip())

            def fmt(result) -> tuple[str, str]:
                if result.error:
                    return f"*Error: {result.error}*", f"**Model:** `{result.model}`\n\n---\n\n> {result.error}"
                return f"*Done — `{result.model}`*", result.response_text

            alpha_s, alpha_text = fmt(alpha_result)
            beta_s, beta_text = fmt(beta_result)
            gamma_s, gamma_text = fmt(gamma_result)
            analyst_s, analyst_text = fmt(analyst_result)

            yield (
                alpha_s, beta_s, gamma_s, analyst_s,
                alpha_text, beta_text, gamma_text, analyst_text,
            )

        submit_btn.click(
            fn=on_submit,
            inputs=[topic_input],
            outputs=[alpha_status, beta_status, gamma_status, analyst_status,
                     alpha_out, beta_out, gamma_out, analyst_out],
        )
        topic_input.submit(
            fn=on_submit,
            inputs=[topic_input],
            outputs=[alpha_status, beta_status, gamma_status, analyst_status,
                     alpha_out, beta_out, gamma_out, analyst_out],
        )

    return demo
