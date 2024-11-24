class AppState {  
    // 카테고리, 캐릭터 디폴트
    constructor() {  
        this.reset();  
    }  

    reset() {  
        this.selectedTopic = '';  
        this.selectedCharacter = '';  
        this.currentWord = '';  
        this.score = 0;  
        this.totalAttempts = 0;  
        this.isRecording = false;  
        this.mediaRecorder = null;  
        this.audioChunks = [];  
        this.isInitialized = false;  
    }  
}  

class WordFriendsApp {  
    constructor() {  
        this.state = new AppState();
        this.state = {  
            currentWord: '',  
            score: 0,  
            totalAttempts: 0,  
            totalWords: 0,  
            correctWords: 0,  
            streak: 0,  
            bestStreak: 0,
            isRecording: false,
            isLoggedIn: false,  
            currentUser: null,
 
        }; 
        // Speech Recognition 초기화  
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();  
        this.recognition.lang = 'en-US';  
        this.recognition.continuous = false;  
        this.recognition.interimResults = false;  
        
        // Speech Recognition 이벤트 핸들러 설정  
        this.setupSpeechRecognition();
        this.setupAuthListeners();  
        this.initialize();  
    }  


    setupAuthListeners() {  
        // 로그인 버튼 클릭  
        $('#login-btn').on('click', () => {  
            $('#auth-modal').removeClass('hidden');  
        });  

        // 모달 닫기  
        $('#close-modal').on('click', () => {  
            $('#auth-modal').addClass('hidden');  
        });  

        // 탭 전환  
        $('#login-tab').on('click', () => this.switchAuthTab('login'));  
        $('#register-tab').on('click', () => this.switchAuthTab('register'));  

        // 로그인 폼 제출  
        $('#login-form').on('submit', async (e) => {  
            e.preventDefault();  
            await this.handleLogin();  
        });  

        // 회원가입 폼 제출  
        $('#register-form').on('submit', async (e) => {  
            e.preventDefault();  
            await this.handleRegister();  
        });  
    }  

    switchAuthTab(tab) {  
        if (tab === 'login') {  
            $('#login-tab').addClass('border-purple-600 text-purple-600').removeClass('border-gray-200 text-gray-500');  
            $('#register-tab').removeClass('border-purple-600 text-purple-600').addClass('border-gray-200 text-gray-500');  
            $('#login-form').removeClass('hidden');  
            $('#register-form').addClass('hidden');  
        } else {  
            $('#register-tab').addClass('border-purple-600 text-purple-600').removeClass('border-gray-200 text-gray-500');  
            $('#login-tab').removeClass('border-purple-600 text-purple-600').addClass('border-gray-200 text-gray-500');  
            $('#register-form').removeClass('hidden');  
            $('#login-form').addClass('hidden');  
        }  
    }  

    async handleLogin() {  
        const id = $('#login-id').val();  
        const password = $('#login-password').val();  

        this.showLoading();  
        try {  
            const response = await fetch('/api/login', {  
                method: 'POST',  
                headers: {  
                    'Content-Type': 'application/json',  
                },
                body: JSON.stringify({ id, password })  
            });
            
            const data = await response.json();  
            if (data.success) {  
                this.state.isLoggedIn = true;  
                this.state.currentUser = data.user;  
                
                this.showResultRegistlog(data.user.nickname + '님 반갑습니다.!', true, 'login');
                $('#auth-modal').addClass('hidden');  
                this.updateLoginButton();  
                this.showResult('로그인 성공!', true);  
            } else {
                this.showResult('로그인 실패: ' + data.message, false);  
            }
        } catch (error) { 
            console.error('Login error:', error);  
            this.showResult('로그인 중 오류가 발생했습니다.', false);  
        } finally {  
            this.hideLoading();
        }  
    }  

    async handleRegister() {  
        const id = $('#register-id').val();  
        const password = $('#register-password').val();  
        const nickname = $('#register-nickname').val();  

        this.showLoading();  
        try {  
            const response = await fetch('/api/register', {  
                method: 'POST',  
                headers: {  
                    'Content-Type': 'application/json',  
                },  
                body: JSON.stringify({ id, password, nickname })  
            });  

            const data = await response.json();  
            if (data.success) {  
                this.switchAuthTab('login');  
                this.showResultRegistlog('회원가입 성공! 로그인해주세요.', true, 'register');  
            } else {  
                this.showResultRegistlog('회원가입 실패: ' + data.message, false, 'register');  
            }  
        } catch (error) {  
            console.error('Register error:', error);  
            this.showResultRegistlog('회원가입 중 오류가 발생했습니다.', false, 'register');  
        } finally {  
            this.hideLoading();  
        }  
    }  

    updateLoginButton(nickname) {  
        if (this.state.isLoggedIn) {  
            // $('#login-btn').text(this.state.currentUser.nickname);  
            $('#login-btn').text('로그아웃');  
            $('#login_nickname').text(nickname + '님 반갑습니다.');
        } else {  
            $('#login-btn').text('로그인');  
        }  
    }  



    // 결과 표시 메서드 수정  
    showResultRegistlog(message, isSuccess = true, type ){ 

        const resultContainer = $('#' + type + '-message'); 

        resultContainer.html(message);  
        resultContainer.removeClass('result-success result-error');  
        resultContainer.addClass(isSuccess ? 'result-success' : 'result-error');  
        
        // 결과 표시 애니메이션  
        resultContainer.css('animation', 'none');  
        resultContainer[0].offsetHeight; // reflow  
        resultContainer.css('animation', isSuccess ? 'popIn 0.5s ease' : 'shake 0.5s ease');  
    }  


    async initialize() {  
        try {  
            const response = await $.get('/api/check_initialization');  
            
            // 초기 상태 설정  
            this.state.selectedTopic = response.selected_topic || '';  
            this.state.selectedCharacter = response.selected_character || '';  
            this.state.score = response.score || 0;  
            this.state.totalAttempts = response.total_attempts || 0;  
            this.state.isInitialized = response.is_initialized || false;  
    
            // UI 업데이트  
            if (this.state.selectedTopic) {  
                $(`.topic-btn[data-topic="${this.state.selectedTopic}"]`).addClass('active');  
                this.updateSelectedTopic(this.state.selectedTopic);  
            }  
            
            if (this.state.selectedCharacter) {  
                $(`.character-btn[data-gender="${this.state.selectedCharacter}"]`).addClass('active');  
                this.updateSelectedCharacter(this.state.selectedCharacter);  
            }  
    
            this.updateScore();  
            this.setupEventListeners();  
            this.updateUI();
    
            // 초기화가 완료되었다면 단어 카드 표시  
            if (this.state.isInitialized) {  
                this.getNewWord();  
            }
            // 첫 단어 카드 생성  
            if (this.state.currentWord) {  
                this.createOrUpdateWordCard(this.state.currentWord);  
            }
            this.updateStatistics(); // 초기 통계 표시 
        } catch (error) {  
            console.error('초기화 중 오류 발생:', error);  
            this.showError('앱 초기화 중 오류가 발생했습니다.');  
        }  
    }


    setupEventListeners() {  
        // 주제 선택 이벤트  
        $('.topic-btn, .topic-image-container').on('click', (e) => {  
            const $button = $(e.target).closest('.topic-item').find('.topic-btn');  
            const topic = $button.data('topic');  
            this.handleTopicSelection(topic, $button);  
        });  

        // 캐릭터 선택 이벤트  
        $('.character-btn, .character-image-container').on('click', (e) => {  
            const $button = $(e.target).closest('.character-item').find('.character-btn');  
            const character = $button.data('gender');  
            this.handleCharacterSelection(character, $button);  
        });  

        // 새 단어 받기 이벤트 (스페이스바)  
        $(document).on('keydown', (e) => {  
            if (e.code === 'Space' && !this.state.isRecording) {  
                e.preventDefault();  
                this.getNewWord();  
            }  
        });  
    }  

    async handleTopicSelection(topic, $button) {  
        try {  
            if (!topic) {  
                throw new Error('유효하지 않은 주제입니다.');  
            }  
    
            const response = await $.ajax({  
                url: '/api/set_topic',  
                method: 'POST',  
                contentType: 'application/json',  
                data: JSON.stringify({ topic })  
            });  
    
            if (response.success) {  
                $('.topic-btn').removeClass('active');  
                $button.addClass('active');  
                this.state.selectedTopic = topic;  
                this.updateSelectedTopic(topic);  
                if (response.word) {  
                    this.updateWord(response.word);  
                }  
                this.updateUI();  
                this.showFeedback(`'${topic}' 주제가 선택되었습니다.`);  
            } else {  
                throw new Error(response.error || '주제 선택에 실패했습니다.');  
            }  
        } catch (error) {  
            this.showError(error.message || '주제 선택 중 오류가 발생했습니다.');  
            $button.removeClass('active');  
            this.state.selectedTopic = '';  
            this.updateUI();  
        }  
    }
    
    async handleCharacterSelection(character, $button) {  
        try {  
            const response = await $.ajax({  
                url: '/api/set_character',  
                method: 'POST',  
                contentType: 'application/json',  
                data: JSON.stringify({ character })  
            });  

            if (response.success) {  
                $('.character-btn').removeClass('active');  
                $button.addClass('active');  
                this.state.selectedCharacter = character;  
                this.updateSelectedCharacter(character);  
                this.updateUI();  
                this.showFeedback(`'${character}' 캐릭터가 선택되었습니다.`);  
            }  
        } catch (error) {  
            this.showError('캐릭터 선택 중 오류가 발생했습니다.');  
        }  
    }  


    
    async resetApp() {  
        try {  
            const response = await $.ajax({  
                url: '/api/reset_session',  
                method: 'POST'  
            });  

            if (response.success) {  
                this.state.reset();  
                $('.topic-btn, .character-btn').removeClass('active');  
                $('#word-cards-container').empty();  
                this.updateUI();  
                this.showFeedback('앱이 초기화되었습니다.');  
            }  
        } catch (error) {  
            this.showError('초기화 중 오류가 발생했습니다.');  
        }  
    }  


    updateSelectedTopic(topic) {  
        $('#selected-topic').text(`선택된 주제: ${topic}`);  
    }  

    updateSelectedCharacter(character) {  
        $('#selected-gender').text(`선택된 캐릭터: ${character}`);  
    }  

    updateWord(word) {  
        this.state.currentWord = word;  
        this.createOrUpdateWordCard(word);  
        $('#feedback-message').removeClass('success error').text('');  
    }  


    createOrUpdateWordCard(word) {  
        // 기존 카드 제거  
        $('#word-card').remove();  
    
        const cardHtml = `  
            <div id="word-card" class="word-card bg-white rounded-lg shadow-lg p-8 transform transition-all duration-300 hover:scale-105 max-w-md mx-auto">  
                <div class="text-4xl font-bold mb-6 text-purple-600 text-center">${word}</div>  
                <div class="flex flex-col gap-4">  
                    <button id="play-btn" class="play-btn group px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center">  
                        <i class="fas fa-play mr-2"></i>  
                        <span class="group-hover:tracking-wider transition-all duration-200">Play</span>  
                    </button>  
                    <button id="mic-btn" class="mic-btn group px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center">  
                        <i class="fas fa-microphone mr-2"></i>  
                        <span class="group-hover:tracking-wider transition-all duration-200">Record</span>  
                    </button>  
                </div>  
                <div id="result-container" class="mt-6 text-center"></div>  
            </div>`;  
    
        // 카드를 컨테이너에 추가  
        $('#word-container').html(cardHtml);  
    
        // 애니메이션 관련 스타일 추가  
        if (!$('#card-animation-style').length) {  
            $('head').append(`  
                <style id="card-animation-style">  
                    .word-card {  
                        opacity: 0;  
                        animation: slideIn 0.5s ease forwards;  
                    }  
                    
                    @keyframes slideIn {  
                        from {  
                            opacity: 0;  
                            transform: translateY(20px);  
                        }  
                        to {  
                            opacity: 1;  
                            transform: translateY(0);  
                        }  
                    }  
                    
                    .play-btn:active, .mic-btn:active {  
                        transform: scale(0.95);  
                    }  
                    
                    .result-success {  
                        animation: popIn 0.5s ease;  
                        color: #10B981;  
                    }  
                    
                    .result-error {  
                        animation: shake 0.5s ease;  
                        color: #EF4444;  
                    }  
                    
                    @keyframes popIn {  
                        0% { transform: scale(0.8); opacity: 0; }  
                        100% { transform: scale(1); opacity: 1; }  
                    }  
                    
                    @keyframes shake {  
                        0%, 100% { transform: translateX(0); }  
                        25% { transform: translateX(-5px); }  
                        75% { transform: translateX(5px); }  
                    }  
                </style>  
            `);  
        }  
    
        // 버튼 이벤트 리스너 추가  
        this.setupButtonListeners();  
    }  
    
    // 버튼 이벤트 리스너 설정을 위한 새로운 메서드  
    setupButtonListeners() {  
        const playBtn = $('#play-btn');  
        const micBtn = $('#mic-btn');  

        // 버튼 호버 효과  
        [playBtn, micBtn].forEach(btn => {  
            btn.on('mouseenter', function() {  
                $(this).find('i').addClass('animate-bounce');  
            }).on('mouseleave', function() {  
                $(this).find('i').removeClass('animate-bounce');  
            });  
        });  

        // 기존의 클릭 이벤트 리스너들  
        playBtn.on('click', () => {  
            this.playWord();  
            playBtn.addClass('scale-95');  
            setTimeout(() => playBtn.removeClass('scale-95'), 200);  
        });  

        micBtn.on('click', () => {  
            this.startRecording();  
            micBtn.addClass('scale-95');  
            setTimeout(() => micBtn.removeClass('scale-95'), 200);  
        });  
    }  

    // 새 단어를 가져오는 메서드  
    async getNewWord() {  
        try {  
            // API 호출 등의 로직...  
            
            // 새 단어로 카드 업데이트  
            this.createOrUpdateWordCard(this.state.currentWord);  
        } catch (error) {  
            console.error('Error getting new word:', error);  
        }  
    }  
    
    // 결과 표시 메서드 수정  
    showResult(message, isSuccess = true) {  
        const resultContainer = $('#result-container');  
        resultContainer.html(message);  
        resultContainer.removeClass('result-success result-error');  
        resultContainer.addClass(isSuccess ? 'result-success' : 'result-error');  
        
        // 결과 표시 애니메이션  
        resultContainer.css('animation', 'none');  
        resultContainer[0].offsetHeight; // reflow  
        resultContainer.css('animation', isSuccess ? 'popIn 0.5s ease' : 'shake 0.5s ease');  
    }  

    async playWord() {  
        if (!this.validateSelections()) return;  
        
        try {  
            const response = await fetch('/play_word', {  
                method: 'POST',  
                headers: {  
                    'Content-Type': 'application/json',  
                },  
                body: JSON.stringify({  
                    word: this.state.currentWord,  
                    gender: this.state.selectedCharacter  
                })  
            });  

            if (!response.ok) throw new Error('음성 재생에 실패했습니다.');  

            const blob = await response.blob();  
            const audio = new Audio(URL.createObjectURL(blob));  
            audio.play();  
        } catch (error) {  
            this.showError('음성 재생 중 오류가 발생했습니다.');  
        }  
    }  

    showFeedback(message, isError = false) {  
        const $feedback = $('#feedback-message');  
        $feedback.removeClass('success error')  
            .addClass(isError ? 'error' : 'success')  
            .text(message);  

        setTimeout(() => {  
            $feedback.removeClass('success error').text('');  
        }, 3000);  
    }  

    validateSelections() {  
        if (!this.state.selectedTopic || !this.state.selectedCharacter) {  
            this.showFeedback('주제와 캐릭터를 먼저 선택해주세요.', true);  
            return false;  
        }  
        return true;  
    }  

    async getNewWord() {  
        if (!this.validateSelections()) return;  

        try {  
            const response = await $.ajax({  
                url: '/api/get_random_word',  
                method: 'POST',  
                contentType: 'application/json',  
                data: JSON.stringify({ topic: this.state.selectedTopic })  
            });  

            this.updateWord(response.word);  
            this.showFeedback('새로운 단어가 선택되었습니다.');  
        } catch (error) {  
            this.showError('새 단어를 가져오는데 실패했습니다.');  
        }  
    }  

    showError(message) {  
        this.showFeedback(message, true);  
    }  


    updateUI() {  
        const isReady = this.state.selectedTopic && this.state.selectedCharacter;  
        
        // 학습 섹션 표시/숨김  
        $('#learning-section').toggleClass('hidden', !isReady);  
        $('#word-cards-container').toggleClass('hidden', !isReady);  
        
        // 버튼 상태 업데이트  
        $('.play-btn, .mic-btn').prop('disabled', !isReady)  
            .toggleClass('disabled', !isReady);  
            
        // 선택 정보 업데이트  
        this.updateSelectedTopic(this.state.selectedTopic || '주제를 선택해주세요');  
        this.updateSelectedCharacter(this.state.selectedCharacter || '캐릭터를 선택해주세요');  
        
        // 점수 업데이트  
        this.updateScore();  
    }  

    updateScore() {  
        $('#score').text(this.state.score);  
        $('#total-attempts').text(this.state.totalAttempts);  
    }
    // 통계 업데이트 메서드  
    updateStatistics() {  
        const accuracy = this.state.totalWords === 0 ? 0 :   
            Math.round((this.state.correctWords / this.state.totalWords) * 100);  
        
        $('#accuracy').text(`${accuracy}%`);  
        $('#total-words').text(this.state.totalWords);  
        $('#current-streak').text(this.state.streak);  
        $('#best-streak').text(this.state.bestStreak);  

        // 통계 카드 업데이트 애니메이션  
        $('.stat-card').addClass('animate-pulse');  
        setTimeout(() => {  
            $('.stat-card').removeClass('animate-pulse');  
        }, 500);  
    }  

    // 로딩 상태 표시 메서드  
    showLoading() {  
        const loadingHtml = `  
            <div class="loading-spinner fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">  
                <div class="bg-white rounded-lg p-6 flex flex-col items-center">  
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>  
                    <div class="mt-4 text-gray-700">Loading...</div>  
                </div>  
            </div>`;  
        $('body').append(loadingHtml);  
    }  

    hideLoading() {  
        $('.loading-spinner').remove();  
    }  

    // Speech Recognition 설정  
    setupSpeechRecognition() {  
        this.recognition.onstart = () => {  
            this.state.isRecording = true;  
            $('#mic-btn').addClass('recording');  
            this.showResult('듣고 있습니다...', true);  
        };  

        this.recognition.onend = () => {  
            this.state.isRecording = false;  
            $('#mic-btn').removeClass('recording');  
        };  

        this.recognition.onresult = (event) => {  
            const result = event.results[0][0].transcript;  
            this.handleSpeechResult(result);  
        };  

        this.recognition.onerror = (event) => {  
            console.error('Speech recognition error:', event.error);  
            this.showResult('음성 인식 오류가 발생했습니다.', false);  
            this.state.isRecording = false;  
            $('#mic-btn').removeClass('recording');  
        };  
    }  

    // 녹음 시작  
    startRecording() {  
        if (!this.state.isRecording) {  
            this.recognition.start();  
        }  
    }  

    // // 음성 인식 결과 처리  
    // handleSpeechResult(result) {  
    //     const userAnswer = result.toLowerCase().trim();  
    //     const isCorrect = this.checkAnswer(userAnswer);  
        
    //     if (isCorrect) {  
    //         this.showResult('정답입니다! 🎉', true);  
    //         // 잠시 후 새로운 단어 가져오기  
    //         setTimeout(() => this.getNewWord(), 1500);  
    //     } else {  
    //         this.showResult('다시 시도해보세요 😅', false);  
    //     }  
    // }  

    // // 정답 체크  
    // checkAnswer(userAnswer) {  
    //     const isCorrect = userAnswer === this.state.currentWord.toLowerCase();  
        
    //     this.state.totalWords++;  
    //     if (isCorrect) {  
    //         this.state.correctWords++;  
    //         this.state.streak++;  
    //         this.state.bestStreak = Math.max(this.state.streak, this.state.bestStreak);  
    //     } else {  
    //         this.state.streak = 0;  
    //     }  
        
    //     this.updateStatistics();  
    //     return isCorrect;  
    // }  
    // 음성 인식 결과 처리  
    async handleSpeechResult(result) {  
        const userAnswer = result.toLowerCase().trim();  
        
        try {  
            this.showLoading();  
            const response = await fetch('/api/check-answer', {  
                method: 'POST',  
                headers: {  
                    'Content-Type': 'application/json',  
                },  
                body: JSON.stringify({  
                    userAnswer: userAnswer,  
                    currentWord: this.state.currentWord  
                })  
            });  

            const data = await response.json();  
            
            if (data.isCorrect) {  
                this.state.correctWords++;  
                this.state.streak++;  
                this.state.bestStreak = Math.max(this.state.streak, this.state.bestStreak);  
                this.showResult('정답입니다! 🎉', true);  
                setTimeout(() => this.getNewWord(), 1500);  
            } else {  
                this.state.streak = 0;  
                this.showResult(`틀렸습니다. 정확한 발음: ${data.correctPronunciation}`, false);  
            }  

            this.state.totalWords++;  
            this.updateStatistics();  

        } catch (error) {  
            console.error('Error checking answer:', error);  
            this.showResult('오류가 발생했습니다.', false);  
        } finally {  
            this.hideLoading();  
        }  
    }  

    // checkAnswer 메서드는 제거 (백엔드로 이동)
}  

// 앱 초기화  
$(document).ready(() => {  
    window.app = new WordFriendsApp();  
});  

// 스타일 추가  
$('head').append(`  
    <style>  
        .topic-btn.active, .character-btn.active {  
            background-color: #4F46E5;  
            color: white;  
        }  

        .recording {  
            animation: pulse 1.5s infinite;  
            background-color: #EF4444 !important;  
        }  

        @keyframes pulse {  
            0% { opacity: 1; }  
            50% { opacity: 0.5; }  
            100% { opacity: 1; }  
        }  

        .disabled {  
            opacity: 0.5;  
            cursor: not-allowed;  
        }  

        #feedback-message {  
            min-height: 24px;  
            transition: all 0.3s ease;  
        }  

        #feedback-message.success {  
            color: #10B981;  
        }  

        #feedback-message.error {  
            color: #EF4444;  
        }  

        @keyframes fadeIn {  
            from { opacity: 0; transform: translateY(-10px); }  
            to { opacity: 1; transform: translateY(0); }  
        }  

        #feedback-message:not(:empty) {  
            animation: fadeIn 0.3s ease-out;  
        }

        .word-card {  
            opacity: 0;  
            animation: slideIn 0.5s ease forwards;  
        }  
        
        @keyframes slideIn {  
            from {  
                opacity: 0;  
                transform: translateY(20px);  
            }  
            to {  
                opacity: 1;  
                transform: translateY(0);  
            }  
        }  
        
        .result-success {  
            animation: popIn 0.5s ease;  
            color: #10B981;  
        }  
        
        .result-error {  
            animation: shake 0.5s ease;  
            color: #EF4444;  
        }  
        
        @keyframes popIn {  
            0% { transform: scale(0.8); opacity: 0; }  
            100% { transform: scale(1); opacity: 1; }  
        }  
        
        @keyframes shake {  
            0%, 100% { transform: translateX(0); }  
            25% { transform: translateX(-5px); }  
            75% { transform: translateX(5px); }  
        }
            .stat-card {  
            transition: all 0.3s ease;  
        }  
        
        .stat-card:hover {  
            transform: translateY(-2px);  
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),   
                       0 2px 4px -1px rgba(0, 0, 0, 0.06);  
        }  

        @keyframes pulse {  
            0%, 100% { transform: scale(1); }  
            50% { transform: scale(1.05); }  
        }  

        .animate-pulse {  
            animation: pulse 0.5s ease;  
        }
            #mic-btn.recording {  
            animation: pulse-red 1.5s infinite;  
            background-color: #EF4444;  
        }  

        @keyframes pulse-red {  
            0% {  
                transform: scale(1);  
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);  
            }  
            
            70% {  
                transform: scale(1.05);  
                box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);  
            }  
            
            100% {  
                transform: scale(1);  
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);  
            }  
        }  
    </style>  
`);