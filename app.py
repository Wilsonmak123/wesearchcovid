from __future__ import unicode_literals
from ast import literal_eval

from flask import Flask,render_template,request,redirect
import json
import numpy as np
import pandas as pd
import string, re
from cdqa.pipeline import QAPipeline
from cdqa.utils.download import download_squad, download_model, download_bnpp_data

app = Flask(__name__)
file_path = r'.\data.csv'
urls = []
try:
    df = pd.read_csv(file_path, converters={'paragraphs': literal_eval})
    cdqa_pipeline = QAPipeline(reader='models/distilbert_qa.joblib')
    cdqa_pipeline.fit_retriever(df=df)
    
except IOError:
    print('error')

#def choose_model():  #done
    #model = download_model(model='bert-squad_1.1', dir='./models')
    #return model

regex = re.compile('[%s]' % re.escape(string.punctuation))

def remove_punctuation(txt):
    return regex.sub('', txt)

def accept_userinput():
    query = input("Enter your question: ")
    query = remove_punctuation(query)
    return str(query)

#ask need to open a new folder name model?
def get_result(query, numOfResult=10):
    prediction = cdqa_pipeline.predict(query=query,retriever_score_weight=0.35, n_predictions=numOfResult) 
    result = []
    for doc in prediction:
        print(doc)
        related_doi = df[df.title == doc[1]].index
        idx = related_doi.tolist()[0]
        row = {'title': str(doc[1]), 'answer': str(doc[0]), 'abstract': str(df['abstract'][idx]), 'url': str(df['doi'][idx])}
        result.append(row)

    return json.dumps(result)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/query')
def query():
    keyword = request.args.get('keyword')
    
    if keyword is None or len(keyword) <= 0:
        return json.dumps([])
        
    return get_result(keyword)

if __name__=='__main__':
    app.run(debug=True)