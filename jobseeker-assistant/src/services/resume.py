class Resume:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface
        self.base_resume=''
        fields = self.get_fields()
        with open(fields['baseResume'], 'r', encoding='utf-8') as file:
            self.base_resume = file.read()

    def generate(self, jd, company, title, context):
        template=self.config['prompt']
        model=self.config['model']
        prompt = template.format(job_title=title, company=company, job_description=jd, base_resume=self.base_resume)
        prompt = f"{prompt} {context}"
        return self.llm.generate(prompt, model)
    
    def get_fields(self):
        return self.config['input']

    def get_resume(self):
        return self.base_resume
