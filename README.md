<img src="https://img.shields.io/badge/python-3.6-green" alt="python 3.6" /> <img src="https://img.shields.io/badge/flask-1.1.2-blue" alt="flask" /> <img src="https://img.shields.io/badge/BERT-red" alt="BERT" />

# What is wesearchcovid

wesearchcovid is a closed-domain Question Answering System. It retrieved the papers from the White House and a coalition of leading </br> research groups. The objective is to returnan answer from the text of paper.

# A brief pictures of the QA system
![image](https://i.imgur.com/VCsuIFN.jpg)

The retriever creates  TF-IDF features based on uni-gram and bi-gram. When a user enters a query, it calculates the cosine similarity between the query and each sentence of the articles and assigns the score.  Then, the reader (BERT) will read through all the documents and return the highest similarity score corresponding to the query.  

# How to use 
Cloning this respiratory, open your code editor and cd to flask_app folder.<br/>
 
 `flask run ` <br/>
 
 After running this command, it will establish a localhost server and you can access to use it! <br/>
 
 # UI
 ![image](https://i.imgur.com/oJTA7VE.jpg)
 
