# pip install flask
# pip install flask-requests
from flask import Flask, render_template, request, jsonify, session, send_file

# pip install SpeechRecognition
import speech_recognition as sr  
# import SpeechRecognition as sr 

import random 

# pip install python-Levenshtein
# import Levenshtein  

# pip install psycopg2
# pip install psycopg2-binary==2.9.10
# # pip install pycopy-aifc
# pip install standard-aifc
import psycopg2

# pip install gTTS    
from gtts import gTTS  
from googletrans import Translator  
import os  
import tempfile  
from pathlib import Path  
import json  
from werkzeug.security import generate_password_hash, check_password_hash  
from difflib import SequenceMatcher


import sqlalchemy as sa
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine

###########################################
# python -m pip freeze > requirements.txt
# pip list --format=freeze > requirements.txt
# pip install -r requirements.txt
###########################################





app = Flask(__name__)  
app.secret_key = 'your_secret_key_here'  # 실제 운영 환경에서는 더 복잡한 키를 사용하세요  
app.secret_key = os.urandom(24)

# 임시 파일을 저장할 디렉토리 생성  
TEMP_DIR = Path(tempfile.gettempdir()) / "word_friends"  
TEMP_DIR.mkdir(exist_ok=True)  




###########################################
# db conn info
###########################################
# # # local
# db = psycopg2.connect(dbname='test',
#                       user='admin',
#                       host='localhost',
#                       password='123!@#4$',
#                       port=5432)
# cur = db.cursor()

# # # local
# engine = sa.create_engine("postgresql://admin:1234@localhost/test")

# # vercel
engine = sa.create_engine("postgresql://neondb_owner:Wcid23lFsHTK@ep-blue-lab-a1gjolcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")




users = {}  

@app.route('/api/register', methods=['POST'])  
def register():  
    data = request.get_json()  
    user_id = data.get('id')  
    password = data.get('password')  
    nickname = data.get('nickname')  

    with engine.connect() as conn:
        cur = conn.exec_driver_sql("SELECT * FROM user_info where user_id = '" + user_id + "' ")
        q_val = cur.fetchone()

    if q_val != None:
        print(q_val)
        return jsonify({'success': False, 'message': '이미 존재하는 아이디입니다.'})  

    # password = generate_password_hash(password)
    
    with engine.begin() as conn:
        conn.execute(sa.text("INSERT INTO user_info (user_id, user_pwd, user_nick) VALUES ('" + user_id + "', '" + password + "', '" + nickname + "')"))
    

    return jsonify({'success': True})  

@app.route('/api/login', methods=['POST'])  
def login():
    data = request.get_json()  
    user_id = data.get('id')  
    password = data.get('password')
    # password = generate_password_hash(password)


    with engine.connect() as conn:
        cur = conn.exec_driver_sql("SELECT user_pwd, user_nick FROM user_info where user_id = '" + user_id + "' ")
        q_val = cur.fetchone()


    if q_val == None:
        return jsonify({'success': False, 'message': '존재하지 않는 아이디입니다.'})  


    # if check_password_hash(user['password_hash'], password):
    if q_val[0]== password:
        return jsonify({  
            'success': True,  
            'user': {  
                'id': user_id,  
                'nickname': q_val[1]
            }
        })
    return jsonify({'success': False, 'message': '비밀번호가 일치하지 않습니다.'})



# 초기 세션 상태 설정 함수  
def initialize_session_state():  
    # if 'current_word' not in session:  
    #     session['current_word'] = ''  
    # if 'score' not in session:  
    #     session['score'] = 0  
    # if 'total_attempts' not in session:  
    #     session['total_attempts'] = 0  
    # if 'selected_topic' not in session:  
    #     session['selected_topic'] = ''  
    # if 'selected_character' not in session:  
    #     session['selected_character'] = ''  
    # if 'is_initialized' not in session:  
    #     session['is_initialized'] = False

    # 카테고리, 캐릭터 디폴트
    # 세션을 완전히 초기화  
    session.clear()  
    # 기본값 설정  
    session['current_word'] = ''  
    session['score'] = 0  
    session['total_attempts'] = 0  
    session['selected_topic'] = ''  
    session['selected_character'] = ''  
    session['is_initialized'] = False  

# 단어 목록  
def get_word_list(topic):  
    word_lists = {  
        'School': ['teacher', 'student', 'classroom', 'book', 'pencil',  
                  'desk', 'blackboard', 'homework', 'library', 'exam',  
                  'notebook', 'chair', 'teacher\'s desk', 'student id card', 'ruler'],  
        'Family': ['mother', 'father', 'sister', 'brother', 'grandmother',  
                  'grandfather', 'aunt', 'uncle', 'cousin', 'baby'],  
        'Animals': ['dog', 'cat', 'bird', 'fish', 'rabbit',  
                   'elephant', 'lion', 'tiger', 'monkey', 'giraffe'],  
        'Weather': ['sunny', 'rainy', 'cloudy', 'windy', 'snowy',  
                   'hot', 'cold', 'warm', 'cool', 'stormy'],  
        'Food': ['pizza', 'hamburger', 'spaghetti', 'rice', 'bread',  
                'salad', 'soup', 'chicken', 'ice cream', 'cake']  
    }  
    # return word_lists.get(topic, word_lists['School'])
    return word_lists.get(topic, [])  # 기본값을 빈 리스트로 변경  

@app.route('/')  
def index():  
    initialize_session_state()  
    return render_template('index.html')  

@app.route('/api/check_initialization', methods=['GET'])  
def check_initialization():
    # 현재 선택된 주제와 캐릭터 가져오기  
    current_topic = session.get('selected_topic', '')  
    current_character = session.get('selected_character', '')  
    
    # 둘 다 선택되었을 때만 초기화되었다고 판단  
    is_initialized = bool(current_topic and current_character)  # 카테고리, 캐릭터 디폴트
    session['is_initialized'] = is_initialized  # 카테고리, 캐릭터 디폴트
    return jsonify({  
        # 'is_initialized': session.get('is_initialized', False),  
        # 'selected_topic': session.get('selected_topic'),  
        # 'selected_character': session.get('selected_character'),
        'is_initialized': is_initialized,  
        'selected_topic': current_topic,  
        'selected_character': current_character, 
        'score': session.get('score', 0),  
        'total_attempts': session.get('total_attempts', 0)  
    })  


@app.route('/api/set_topic', methods=['POST'])  
def set_topic():  
    try:  
        data = request.get_json()  
        topic = data.get('topic', '')   # 카테고리, 캐릭터 디폴트
        
        # 유효한 주제 목록  
        valid_topics = ['School', 'Family', 'Animals', 'Weather', 'Food']  
        
        if topic not in valid_topics:  
            return jsonify({  
                'success': False,   
                'error': f'Invalid topic. Valid topics are: {", ".join(valid_topics)}'  
            }), 400  
            
        words = get_word_list(topic)  
        if not words:  
            return jsonify({  
                'success': False,  
                'error': f'No words found for topic: {topic}'  
            }), 400  
            
        new_word = random.choice(words)  
        
        # 세션 업데이트  
        session['selected_topic'] = topic  
        session['current_word'] = new_word  
        
        # if session.get('selected_character'):  
        #     session['is_initialized'] = True  
        # 둘 다 선택되었을 때만 초기화  # 카테고리, 캐릭터 디폴트
        session['is_initialized'] = bool(  
            session.get('selected_topic') and   
            session.get('selected_character')
        )
            
        return jsonify({  
            'success': True,  
            'topic': topic,  
            'word': new_word,  
            # 'is_initialized': session.get('is_initialized', False)
            'is_initialized': session['is_initialized'] # 카테고리, 캐릭터 디폴트
        })  
        
    except Exception as e:  
        print(f"Error in set_topic: {str(e)}")  # 디버깅을 위한 로그  
        return jsonify({  
            'success': False,  
            'error': f'An error occurred while setting topic: {str(e)}'  
        }), 500
    
@app.route('/api/get_current_topic', methods=['GET'])  
def get_current_topic():  
    return jsonify({  
        'success': True,  
        'topic': session.get('selected_topic', '')    # 카테고리, 캐릭터 디폴트
    })  


@app.route('/api/set_character', methods=['POST'])  
def set_character():  
    try:  
        data = request.get_json()  
        character = data.get('character', '')   # 카테고리, 캐릭터 디폴트
        
        if character not in ['Boy', 'Girl']:  
            return jsonify({'success': False, 'error': 'Invalid character'}), 400  
            
        session['selected_character'] = character  
        
        # if session.get('selected_topic'):  
        #     session['is_initialized'] = True
        # # 둘 다 선택되었을 때만 초기화    # 카테고리, 캐릭터 디폴트
        session['is_initialized'] = bool(  
            session.get('selected_topic') and   
            session.get('selected_character')  
        )
            
        return jsonify({  
            'success': True,  
            'character': character,  
            # 'is_initialized': session.get('is_initialized', False)
            'is_initialized': session['is_initialized']    # 카테고리, 캐릭터 디폴트 
        })  
    except Exception as e:  
        return jsonify({  
            'success': False,  
            'error': str(e)  
        }), 500  

@app.route('/api/get_current_character', methods=['GET'])  
def get_current_character():  
    return jsonify({  
        'success': True,  
        'character': session.get('selected_character', '')  # 카테고리, 캐릭터 디폴트
    })  

@app.route('/api/get_random_word', methods=['POST'])  
def get_random_word():  
    try:  
        topic = session.get('selected_topic', 'School')  
        words = get_word_list(topic)  
        current_word = session.get('current_word', '')  
        
        # 현재 단어를 제외한 새로운 단어 선택  
        available_words = [word for word in words if word != current_word]  
        if not available_words:  
            available_words = words  
            
        word = random.choice(available_words)  
        session['current_word'] = word  
        
        # 카테고리, 캐릭터 디폴트
        topic = session.get('selected_topic', '')  # 'School' 대신 빈 문자열로 변경  
        if not topic:  # 주제가 선택되지 않은 경우  
            return jsonify({  
                'success': False,  
                'error': 'No topic selected'  
            }), 400  
            
        words = get_word_list(topic)  
        current_word = session.get('current_word', '')  
        
        return jsonify({  
            'success': True,  
            'word': word  
        })  
    except Exception as e:  
        return jsonify({  
            'success': False,  
            'error': str(e)  
        }), 500  

@app.route('/play_word', methods=['POST'])  
def play_word():  
    try:  
        data = request.get_json()  
        word = data.get('word')  
        # gender = session.get('selected_character', 'Boy')  
        gender = session.get('selected_character', '')   # 카테고리, 캐릭터 디폴트

        if not word:  
            return jsonify({'success': False, 'error': 'Word is required'}), 400  
        
        # 카테고리, 캐릭터 디폴트
        if not gender:  # 캐릭터가 선택되지 않은 경우  
            return jsonify({'success': False, 'error': 'Character not selected'}), 400  

        # 나머지 코드는 동일  
        # 음성 파일 경로 설정  
        voice_file = TEMP_DIR / f"{word}_{gender}.mp3"  

        # 음성 파일이 없으면 생성  
        if not voice_file.exists():  
            tts = gTTS(text=word, lang='en', slow=False)  
            tts.save(str(voice_file))  

        return send_file(  
            str(voice_file),  
            mimetype='audio/mp3',  
            as_attachment=True,  
            download_name=f"{word}.mp3"  
        )  

    except Exception as e:  
        print(f"Error in play_word: {str(e)}")  
        return jsonify({'success': False, 'error': str(e)}), 500  

@app.route('/api/check_pronunciation', methods=['POST'])  
def check_pronunciation():  
    try:  
        if 'audio' not in request.files:  
            return jsonify({'success': False, 'message': '음성 파일이 없습니다.'}), 400  

        audio_file = request.files['audio']  
        current_word = session.get('current_word', '').lower()  

        # 음성 인식기 초기화  
        recognizer = sr.Recognizer()  

        # 임시 파일로 저장  
        temp_audio = TEMP_DIR / "temp_audio.wav"  
        audio_file.save(str(temp_audio))  

        # 음성 인식  
        with sr.AudioFile(str(temp_audio)) as source:  
            audio = recognizer.record(source)  
            try:  
                recognized_text = recognizer.recognize_google(audio).lower()  
                
                # 정확도 계산  
                if recognized_text == current_word:  
                    session['score'] = session.get('score', 0) + 1  
                    message = "정확한 발음입니다! 👏"  
                    success = True  
                else:  
                    message = f"다시 시도해보세요. 인식된 단어: {recognized_text}"  
                    success = False  

                session['total_attempts'] = session.get('total_attempts', 0) + 1  
                
                return jsonify({  
                    'success': success,  
                    'message': message,  
                    'recognized_text': recognized_text,  
                    'score': session['score'],  
                    'total_attempts': session['total_attempts']  
                })  

            except sr.UnknownValueError:  
                return jsonify({'success': False, 'message': '음성을 인식할 수 없습니다. 다시 시도해주세요.'})  
            except sr.RequestError:  
                return jsonify({'success': False, 'message': '음성 인식 서비스에 접속할 수 없습니다.'})  

    except Exception as e:  
        print(f"Error in check_pronunciation: {str(e)}")  
        return jsonify({'success': False, 'message': f'오류가 발생했습니다: {str(e)}'}), 500  
    finally:  
        # 임시 파일 삭제  
        if 'temp_audio' in locals():  
            temp_audio.unlink(missing_ok=True)  

@app.route('/api/reset_session', methods=['POST'])  
def reset_session():  
    try:  
        session.clear()  
        initialize_session_state()  
        return jsonify({  
            'success': True,  
            'message': '세션이 초기화되었습니다.'  
        })  
    except Exception as e:  
        return jsonify({  
            'success': False,  
            'error': str(e)  
        }), 500  

@app.route('/api/get_score', methods=['GET'])  
def get_score():  
    return jsonify({  
        'success': True,  
        'score': session.get('score', 0),  
        'total_attempts': session.get('total_attempts', 0)  
    })  
@app.route('/api/check-answer', methods=['POST'])  
def check_answer():  
    data = request.get_json()  
    user_answer = data.get('userAnswer', '').lower().strip()  
    current_word = data.get('currentWord', '').lower().strip()  
    
    # 발음 유사도 검사 (0.85 이상이면 정답으로 간주)  
    similarity = SequenceMatcher(None, user_answer, current_word).ratio()  
    is_correct = similarity >= 0.85  

    # 정답 체크 결과 반환  
    return jsonify({  
        'isCorrect': is_correct,  
        'similarity': similarity,  
        'correctPronunciation': current_word,  
        'userPronunciation': user_answer  
    })  

# 단어 데이터베이스 관련 코드도 추가  
words_db = {  
    'easy': ['cat', 'dog', 'bird', ...],  
    'medium': ['elephant', 'giraffe', ...],  
    'hard': ['pronunciation', 'vocabulary', ...]  
}  

@app.route('/api/get-word', methods=['GET'])  
def get_word():  
    difficulty = request.args.get('difficulty', 'easy')  
    word = random.choice(words_db[difficulty])  
    return jsonify({  
        'word': word,  
        'difficulty': difficulty  
    }) 


if __name__ == '__main__':  
    app.run(host='0.0.0.0', port=9900, debug=True)
    # app.run(host='192.168.219.101', port=5000, debug=True)