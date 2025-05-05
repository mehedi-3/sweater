# sweater/sweater/config/sample.py
def get_data():
    return [
        {
            "module_name": "Sample",
            "color": "blue",
            "icon": "octicon octicon-package",
            "type": "module",
            "label": "Sample"
        },
        {
            "label": "Documents",
            "items": [
                {
                    "type": "doctype",
                    "name": "Sample Request",
                    "label": "Sample Request"
                }
            ]
        }
    ]
