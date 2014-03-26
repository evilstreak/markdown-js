if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {

  var DEFAULT_MODIFIER_KEY_PATTERNS = {
    "esc": [
      /^(\s*(?:Esc|Escape|退出)[键符]?\s*)$/i,
      "Esc", {
        "class": "modifier-key esc"
      }
    ],
    "f1f12": function(contents) {
      var matched = contents.match(/^(\s*(F1[0-2]|F[1-9])[键符]?\s*)$/i);
      if (matched) {
        var result = [
          {"class": "modifier-key function " + matched[0].toLowerCase().trim()},
          matched[0].toUpperCase().trim()
        ];
        return result;
      }
    },
    "fn": [
      /^(\s*(?:Fn|功能)[键符]?\s*)$/i,
      "Fn", {
        "class": "modifier-key function fn"
      }
    ],


    "print-screen": [
      /^(\s*(?:Print|Print\s*Screen|Prnt\s*Scrn|打印|打印屏幕|截屏)[键符]?\s*)$/i,
      "Print Screen", {
        "class": "modifier-key print-screen"
      }
    ],
    "sys-req": [
      /^(\s*(?:System\s*Request|Sys\s*Req|Sys|System|系统)[键符]?\s*)$/i,
      "Sys Req", {
        "class": "modifier-key sys-req"
      }
    ],
    "scroll-lock": [
      /^(\s*(?:Scroll|Scroll\s*Lock|Scr\s*Lock|Scr\s*Lck|Scr\s*Lk|滚屏|滚屏锁定)[键符]?\s*)$/i,
      "Scroll Lock", {
        "class": "modifier-key scroll-lock"
      }
    ],
    "pause": [
      /^(\s*(?:Pause|Break|暂停)[键符]?\s*)$/i,
      "Pause/Break", {
        "class": "modifier-key pause-break"
      }
    ],
    "number-lock": [
      /^(\s*(?:Number\s*Lock|Num\s*Lock|Num\s*Lck|Num\s*Lk|数字锁定)[键符]?\s*)$/i,
      "Num Lock", {
        "class": "modifier-key num-lock"
      }
    ],

    "insert": [
      /^(\s*(?:Insert|Ins|插入)[键符]?\s*)$/i,
      "Insert", {
        "class": "modifier-key insert"
      }
    ],
    "delete": [
      /^(\s*(?:Delete|Del|删除)[键符]?\s*)$/i,
      "Delete", {
        "class": "modifier-key delete"
      }
    ],
    "home": [
      /^(\s*Home[键符]?\s*)$/i,
      "Home", {
        "class": "modifier-key home"
      }
    ],
    "end": [
      /^(\s*End[键符]?\s*)$/i,
      "End", {
        "class": "modifier-key end"
      }
    ],
    "page-up": [
      /^(\s*(?:Page\s*Up|Pg\s*Up|上翻页|上页)[键符]?\s*)$/i,
      "Page Up", {
        "class": "modifier-key page-up"
      }
    ],
    "page-down": [
      /^(\s*(?:Page\s*Down|Pg\s*Down|下翻页|下页)[键符]?\s*)$/i,
      "Page Down", {
        "class": "modifier-key page-down"
      }
    ],

    //&#8633;
    "tab": [
      /^(\s*(?:Tab|制表|表格|[↔⇄↹⇋⇌])[键符]?\s*)$/i,
      "Tab", {
        "class": "modifier-key tab"
      }
    ],
    "capslock": [
      /^(\s*(?:大小写|大小写切换|大小写锁定|Caps|Caps\s*Lock)[键符]?\s*)$/i,
      "Caps Lock", {
        "class": "modifier-key caps-lock"
      }
    ],
    //&#8679;
    "shift": [
      /^(\s*(?:Shift|换挡)[键符]?\s*)$/i,
      "Shift", {
        "class": "modifier-key shift"
      }
    ],

    //\u2423
    "space": [
      /^(\s*(?:Space|Space\s*Bar|空格|_{3,})[键符]?\s*)$/i,
      "Space", {
        "class": "modifier-key space"
      }
    ],
    "space-blank": [
      /^(\s+)$/i,
      "Space", {
        "class": "modifier-key space"
      }
    ],
    //&#8676;
    "backspace": [
      /^(\s*(?:Backspace|回退|退格)[键符]?\s*)$/i,
      "Backspace", {
        "class": "modifier-key backspace"
      }
    ],
    //&#8629;
    "enter": [
      /^(\s*(?:Enter|Return|回车|换行)[键符]?\s*)$/i,
      "Enter", {
        "class": "modifier-key enter"
      }
    ],

    "windows-ctrl": [
      /^(\s*(?:Ctrl|Control|控制)[键符]?\s*)$/i,
      "Ctrl", {
        "class": "modifier-key win-ctrl"
      }
    ],
    "windows-alt": [
      /^(\s*(?:Alt|切换)[键符]?\s*)$/i,
      "Alt", {
        "class": "modifier-key win-alt"
      }
    ],
    "windows-start": [
      /^(\s*(?:Windows|Win|Start|开始|Windows命令|Win命令)[键符]?\s*)$/i,
      "Windows", {
        "class": "modifier-key win-start"
      }
    ],
    "windows-menu": [
      /^(\s*(?:Menu|菜单)[键符]?\s*)$/i,
      "Menu", {
        "class": "modifier-key win-menu"
      }
    ],
    //\u2318
    "mac-command": [
      /^(\s*(?:Command|Apple|Apple\s*Key|Mac命令|苹果命令|苹果|\\u2318)[键符]?\s*)$/i,
      "Command", {
        "class": "modifier-key mac-command"
      }
    ],
    //\u2325
    "mac-option": [
      /^(\s*(?:Option|选项|\\u2325)[键符]?\s*)$/i,
      "Option", {
        "class": "modifier-key mac-option"
      }
    ],


    "arrow-left": [
      /^(\s*(?:<<+|<[\-=]+)\s*|(?:\s*左(?:箭头|方向)?[键符]?\s*)|\s*Left[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[《«←⇦↤⇤⇐⇠]+\s*)$/i,
      "\u2190", {
        "class": "modifier-key arrow-left arrow"
      }
    ],
    "arrow-right": [
      /^(\s*(?:>>+|[\-=]+>)\s*|(?:\s*右(?:箭头|方向)?[键符]?\s*)|\s*Right[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[》»→⇨↦⇥⇒⇢]+\s*)$/i,
      "\u2192", {
        "class": "modifier-key arrow-right arrow"
      }
    ],
    "arrow-up": [
      /^(\s*\^\^+\s*|(?:\s*上(?:箭头|方向)?[键符]?\s*)|\s*Up[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[↑⇧⤒↥⇑⇡]+\s*)$/i,
      "\u2191", {
        "class": "modifier-key arrow-up arrow"
      }
    ],
    "arrow-down": [
      /^(\s*vv+\s*|(?:\s*下(?:箭头|方向)?[键符]?\s*)|\s*Down[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[↓⇩⤓↧⇓⇣]+\s*)$/i,
      "\u2193", {
        "class": "modifier-key arrow-down arrow"
      }
    ]
  };

  var InlineKeyStrokeLexicon = {
    modifier_key_patterns: DEFAULT_MODIFIER_KEY_PATTERNS,
    start: "[[",
    stop: "]]",
    wordBoundary: true,
    rawContents: true,

    emitter: function(contents) {
      if (contents === "") {
        return;
      }

      var patterns = DEFAULT_MODIFIER_KEY_PATTERNS;
      var result = null;

      if (this.dialect.options.modifier_key_patterns) {
        patterns = this.dialect.options.modifier_key_patterns;
      }

      for (var name in patterns) {
        var pattern = patterns[name];
        if (typeof pattern === "function") {
          var temp = pattern(contents);
          if (temp) {
            result = temp;
            break;
          }
        } else {
          if (contents.match(pattern[0])) {
            result = [pattern[2], pattern[1]];
            break;
          }
        }
      }

      result = result ? result : contents.trim();
      return ['kbd'].concat(result);
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inlineBetween({
        start: lexicon.start,
        stop: lexicon.stop,
        rawContents: lexicon.rawContents,
        wordBoundary: lexicon.wordBoundary,
        emitter: lexicon.emitter
      });
    }
  };

  module.exports = InlineKeyStrokeLexicon;
});