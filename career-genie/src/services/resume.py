from .utils import read
class Resume:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface
        self.base_resume=''
        fields = self.get_fields()
        self.base_resume = read(fields['baseResume'])

    def generate(self, jd, company, title, context):
        model=self.config['model']
        
        fields = self.get_fields()
        jdAnalysis = fields.get('jdAnalysis',"")
        analysis=self.llm.generate(jdAnalysis, model)

        template=read(self.config['prompt'])
        prompt = template.format(
            job_title=title,
            company=company, 
            job_description=jd, 
            base_resume=self.base_resume, 
            context=context,
            skill_text=analysis)
        return self.llm.generate(prompt, model)
    
    def get_fields(self):
        return self.config['input']

    def get_resume(self):
        return self.base_resume
