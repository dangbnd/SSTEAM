import json
import os
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'stem_steam_education')
IMPORT_DIR = 'exports'  # Thư mục chứa các file JSON cần import

def json_to_mongo(data):
    """
    Chuyển đổi các chuỗi đặc biệt từ JSON về lại định dạng MongoDB (ObjectId, ISODate)
    """
    if isinstance(data, list):
        return [json_to_mongo(item) for item in data]
    elif isinstance(data, dict):
        new_data = {}
        for k, v in data.items():
            # Thử chuyển đổi các trường ngày tháng (ISO format)
            if isinstance(v, str):
                # Kiểm tra if string looks like ObjectId (24 hex chars)
                # Lưu ý: Một số string bình thường cũng có thể dài 24 ký tự, 
                # nhưng thường các trường có tên kết thúc bằng Id hoặc _id sẽ là ObjectId
                if k == '_id' or k.endswith('Id'):
                    try:
                        if len(v) == 24:
                            new_data[k] = ObjectId(v)
                            continue
                    except:
                        pass
                
                # Kiểm tra định dạng ISO Date (ví dụ: 2024-01-20T10:00:00)
                try:
                    if len(v) >= 19 and v[10] == 'T':
                        new_data[k] = datetime.fromisoformat(v.replace('Z', '+00:00'))
                        continue
                except:
                    pass
            
            new_data[k] = json_to_mongo(v)
        return new_data
    return data

def import_json_to_mongodb():
    try:
        if not os.path.exists(IMPORT_DIR):
            print(f"Lỗi: Không tìm thấy thư mục '{IMPORT_DIR}' để import.")
            return

        # Kết nối tới MongoDB
        print(f"Đang kết nối tới MongoDB: {MONGO_URI}")
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]

        # Lấy danh sách các file .json trong thư mục exports
        files = [f for f in os.listdir(IMPORT_DIR) if f.endswith('.json')]
        
        if not files:
            print(f"Không tìm thấy file JSON nào trong thư mục '{IMPORT_DIR}'.")
            return

        print(f"Tìm thấy {len(files)} file để import.")

        for file_name in files:
            collection_name = file_name.replace('.json', '')
            file_path = os.path.join(IMPORT_DIR, file_name)
            
            print(f"Đang import collection '{collection_name}'...", end=" ", flush=True)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                print("Bỏ qua (file rỗng).")
                continue

            # Chuyển đổi dữ liệu về format MongoDB
            mongo_data = json_to_mongo(data)

            # Xóa dữ liệu cũ trước khi import (Tùy chọn: có thể thay đổi thành update/upsert nếu cần)
            db[collection_name].delete_many({})
            
            # Insert dữ liệu
            if isinstance(mongo_data, list):
                db[collection_name].insert_many(mongo_data)
            else:
                db[collection_name].insert_one(mongo_data)
            
            print(f"Thành công! ({len(mongo_data)} documents)")

        print("-" * 30)
        print(f"Hoàn tất import toàn bộ dữ liệu vào database '{DB_NAME}'.")

    except Exception as e:
        print(f"\nLỗi: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    # Xác nhận trước khi chạy vì lệnh này sẽ xóa dữ liệu cũ
    confirm = input("CẢNH BÁO: Lệnh này sẽ xóa dữ liệu hiện có trong các collection để ghi đè dữ liệu mới. \nBạn có chắc chắn muốn tiếp tục? (y/n): ")
    if confirm.lower() == 'y':
        import_json_to_mongodb()
    else:
        print("Đã hủy quá trình import.")
