import gradio as gr
import json, sys, os

from services.llm_interface import LLMInterface
from services.email_response import EmailResponse
from services.resume import Resume
from services.ats import AtsCheck
from services.config import Config

config_service = Config()
config = config_service.load_config()

jobs=config['jobs']
llm=LLMInterface(config['llm'])
email=EmailResponse(jobs['responses'], llm)
resume=Resume(jobs['resume'], llm)
cv=Resume(jobs['coverLetter'], llm)
ats=AtsCheck(jobs['ats'], llm)

with gr.Blocks(title="Hiring Assistant", css=".file-download {height: 4em !important;}") as window:
    gr.Markdown("# 🤖 Personal Hiring AI Assistant")

    with gr.Tab('Resume & Cover Letter'):
        with gr.Row():
            with gr.Column():
                candidate = gr.Textbox(label="Your Name")
            with gr.Column():
                company = gr.Textbox(label="Company")
            with gr.Column():
                title = gr.Textbox(label="Role/Designation")

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
            resume.markdown_to_docx_and_pdf,
            inputs=[resume_output, candidate, resume_btn],
            outputs=[ export_resume_to_docx, export_resume_to_pdf ]
        )
        export_cvl_btn.click(
            cv.markdown_to_docx_and_pdf,
            inputs=[cover_letter_op, candidate, cover_letter_btn],
            outputs=[ export_cvl_to_docx, export_cvl_to_pdf ]
        )
    
    with gr.Tab("Message Responder"):
        email_input = gr.Textbox(label="Recruiter's Message", lines=10)
        email_output = gr.Textbox(label="Generated Response", lines=5)
        email_btn = gr.Button("Generate Response")
        email_btn.click(
            email.response,
            inputs=email_input,
            outputs=email_output
        )
 
window.launch(share=False)