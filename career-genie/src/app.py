import gradio as gr
import json, sys, os

from services.llm_interface import LLMInterface
from services.email_response import EmailResponse
from services.resume import Resume
from services.ats import AtsCheck
from services.config import Config
from services.profile import Profile
from services.utils import cleanup, markdown_to_docx_and_pdf, set_export_config

config = Config()

llm=LLMInterface(config.get('llm'))
email=EmailResponse(config.get('prompts.responses'), llm)
resume=Resume(config.get('prompts.resume'), llm)
cv=Resume(config.get('prompts.coverLetter'), llm)
ats=AtsCheck(config.get('prompts.ats'), llm)
profile=Profile(config.get('prompts.profile'), llm)

# Cleanup export folder with all files having extensions like .md, .docx & .pdf before starting
cleanup(config.get('export.path'))
set_export_config(config.get('export'))

with gr.Blocks(
    title="Career Genie", 
    css=".file-download {height: 4em !important;}",
    theme=gr.themes.Default(font=[gr.themes.GoogleFont("Cascadia Mono"), "Arial", "sans-serif"])
    ) as demo:
    gr.Markdown(f"\
    # 🤖 Career Genie - AI-Powered Job Applications & Career Tools \
    \n\n### Craft high-impact resumes, cover letters, and recruiter responses with AI built for job seekers.\
    \n\nTo get started enter the name desired company to apply and the role/designation you want to apply for")
    with gr.Row():
        with gr.Column():
            candidate = gr.Textbox(label="Your Name")
        with gr.Column():
            company = gr.Textbox(label="Company")
        with gr.Column():
            title = gr.Textbox(label="Role/Designation")

    with gr.Tab('Resume & Cover Letter'):
        with gr.Row():
            with gr.Column():
                context = gr.Textbox(label="Context", lines=10)
                resume_btn = gr.Button("Generate Resume")
            with gr.Column():                
                jd_input = gr.Textbox(label="Job Description", lines=10)
                cover_letter_btn = gr.Button("Generate Cover Letter")
            with gr.Column():
                base_resume = gr.Textbox(label="Base Resume in Markdown", value=resume.get_resume(), lines=5)
                ats_chec_btn = gr.Button("ATS Check & Flaw Report")
        
        with gr.Tab('Resume'):
            with gr.Row():
                with gr.Column():
                    export_resume_btn = gr.Button("Export To PDF & DOCX")
                with gr.Column():
                    export_resume_to_docx = gr.File(label="Download Resume.DOCX", elem_classes=["file-download"])
                with gr.Column():
                    export_resume_to_pdf = gr.File(label="Download Resume.PDF", elem_classes=["file-download"])

            with gr.Row():
                with gr.Column():
                    resume_output = gr.Textbox(label="Generated Resume", lines=10)
                with gr.Column():
                    resume_output_mdv = gr.Markdown(label="Generated Cover Letter", show_copy_button=True)
                    resume_output.change(fn=lambda x: x, inputs=resume_output, outputs=resume_output_mdv)
        
        with gr.Tab('Cover Letter'):
            with gr.Row():
                with gr.Column():
                    export_cvl_btn = gr.Button("Export To PDF & DOCX")
                with gr.Column():
                    export_cvl_to_docx = gr.File(label="Download CoverLetter.DOCX", elem_classes=["file-download"])
                with gr.Column():
                    export_cvl_to_pdf = gr.File(label="Download CoverLetter.PDF", elem_classes=["file-download"])

            with gr.Row():
                with gr.Column():
                    cover_letter_op = gr.Textbox(label="Generated Cover Letter", lines=10)
                with gr.Column():
                    cover_letter_op_mdv = gr.Markdown(label="Generated Cover Letter", show_copy_button=True)
                    cover_letter_op.change(fn=lambda x: x, inputs=cover_letter_op, outputs=cover_letter_op_mdv)

        with gr.Tab('ATS Check'):
            ats_chec_op_mdv = gr.Markdown(label="ATS Check", show_copy_button=True)

        ats_chec_btn.click(
            fn=ats.check,
            inputs=[jd_input, company, title, resume_output],
            outputs=ats_chec_op_mdv
        )    

        resume_btn.click(
            fn=resume.generate, 
            inputs=[jd_input, company, title, context], 
            outputs=resume_output
        )
        cover_letter_btn.click(
            cv.generate,
            inputs=[jd_input, company, title, context],
            outputs=cover_letter_op
        )
        export_resume_btn.click(
            markdown_to_docx_and_pdf,
            inputs=[resume_output, candidate, title, resume_btn],
            outputs=[ export_resume_to_docx, export_resume_to_pdf ]
        )
        export_cvl_btn.click(
            markdown_to_docx_and_pdf,
            inputs=[cover_letter_op, candidate, title, cover_letter_btn],
            outputs=[ export_cvl_to_docx, export_cvl_to_pdf ]
        )
    
    with gr.Tab("Generate Response"):
        with gr.Row():
            with gr.Column():
                email_input = gr.Textbox(label="Recruiter's Message", lines=10)
                email_btn = gr.Button("Generate Response")
            with gr.Column():
                email_output = gr.Textbox(label="Response", lines=10, show_copy_button=True)
                apply_btn = gr.Button("Generate Email to Apply for JD")
        email_btn.click(
            email.response,
            inputs=email_input,
            outputs=email_output
        )
        apply_btn.click(
            email.apply_email,
            inputs=[title, company, resume_output, jd_input],
            outputs=email_output
        )
    
    with gr.Tab('Interview Prep'):
        iv_qna_btn = gr.Button('Conduct Mock Interview')
        iv_qna_txt = gr.Markdown(label='Mock Questions & Answers', show_copy_button=True)

        iv_qna_btn.click(
            fn=profile.interview,
            inputs=[title, jd_input, resume_output],
            outputs=iv_qna_txt
        )

    with gr.Tab('Linkedin Profile Boost'):
        with gr.Row():
            with gr.Column():
                about_me_btn = gr.Button('Generate About Me')
                about_me_txt = gr.Textbox(label='LinkedIn About Me', lines=10, show_copy_button=True)
            with gr.Column():
                conn_req_btn = gr.Button('Connection Request')
                conn_req_txt = gr.Textbox(label='Note', lines=10, show_copy_button=True)
            
            about_me_btn.click(
                fn=profile.linkedin_about_me,
                inputs=[resume_output],
                outputs=about_me_txt
            )
            conn_req_btn.click(
                fn=profile.linkedin_connection,
                inputs=[jd_input, resume_output],
                outputs=conn_req_txt
            )

 
demo.launch()