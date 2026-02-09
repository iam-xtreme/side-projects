from .utils import read
class BaseScore:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface
        fields = self.get_fields()
        self.base_resume = read(fields['baseResume'])

    def check(self, job_description):
        model=self.config['model']
        template=read(self.config['prompt'])
        prompt = template.format(
            job_description=job_description, 
            base_resume=self.base_resume)
        return self.llm.generate(prompt, model)

    def get_fields(self):
        return self.config['input']