class EmailResponse:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface

    def response(self, message):
        template=self.config['prompt'].get('message')
        model=self.config['model']
        prompt = template.format(message=message)
        return self.llm.generate(prompt, model)

    def apply_email(self, title, company, resume, jd):
        template=self.config['prompt'].get('email')
        model=self.config['model']
        prompt = template.format(
            job_title=title,
            company=company,
            job_description=jd,
            resume=resume)
        return self.llm.generate(prompt, model)


