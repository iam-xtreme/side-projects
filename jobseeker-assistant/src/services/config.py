import json
from pathlib import Path
from dotenv import dotenv_values

class Config:
    def __init__(self):
        config = self.__load_config()
        self.config = config

    def __set_nested_value(self, d, key_path, value):
        """Set a nested key in a dictionary given a dot-separated path."""
        keys = key_path.split(".")
        current = d
        for k in keys[:-1]:
            current = current.setdefault(k, {})
        current[keys[-1]] = value

    def __load_config(self):
        config_path = Path("data/config.json")
        config = json.loads(config_path.read_text())

        # Load .env variables using python-dotenv
        env_vars = dotenv_values(".env")  # returns a dict

        # Update config with .env values
        for key_path, value in env_vars.items():
            self.__set_nested_value(config, key_path, value)

        return config

    def get(self, key_path=None):
        config = self.config
        if key_path is not None:
            keys = key_path.split(".")
            for k in keys:
                config = config[k]
        return config
