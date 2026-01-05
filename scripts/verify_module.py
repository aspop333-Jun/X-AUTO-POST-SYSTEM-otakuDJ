
try:
    import lmdeploy.serve.openai.api_server
    print("lmdeploy.serve.openai.api_server found!")
except ImportError:
    print("lmdeploy.serve.openai.api_server NOT found")
    
    try:
        import lmdeploy.serve.api_server
        print("lmdeploy.serve.api_server found!")
    except ImportError:
        print("lmdeploy.serve.api_server NOT found")
