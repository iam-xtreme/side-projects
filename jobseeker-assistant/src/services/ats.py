import markdown2
import pdfkit

class AtsCheck:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface

    def check(self, jd, company, title, resume):
        template=self.config['prompt']
        model=self.config['model']
        prompt = template.format(title=title, company=company, job_description=jd, resume=resume)
        return self.llm.generate(prompt, model)
    
