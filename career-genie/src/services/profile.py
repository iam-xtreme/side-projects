class Profile:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface

    def interview(self, role, job_description, resume):
        template = self.config.get('interview')
        model=self.config['model']
        prompt = template.format(
            role=role,
            job_description=job_description,
            resume=resume
        )
        return self.llm.generate(prompt, model)

    def linkedin_connection(self, job_description, resume):
        template = self.config.get('inConnectionRequest')
        model=self.config['model']
        prompt = template.format(
            job_description=job_description,
            resume=resume
        )
        return self.llm.generate(prompt, model)

    def linkedin_about_me(self, resume):
        template = self.config.get('inAboutMe')
        model=self.config['model']
        prompt = template.format(
            resume=resume
        )
        return self.llm.generate(prompt, model)

    