const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'stemsteam';

async function seedTutorials() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db(dbName);
        
        // Sample tutorial categories
        const categories = [
            {
                name: 'Lập trình Scratch',
                description: 'Học lập trình cơ bản với Scratch',
                slug: 'lap-trinh-scratch',
                icon: '🎮',
                color: '#FF6B6B',
                level: 'beginner',
                subject: 'programming',
                sortOrder: 1,
                requirements: 'Không cần kiến thức trước',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Arduino Cơ bản',
                description: 'Học lập trình Arduino từ cơ bản',
                slug: 'arduino-co-ban',
                icon: '🔌',
                color: '#4ECDC4',
                level: 'beginner',
                subject: 'electronics',
                sortOrder: 2,
                requirements: 'Kiến thức điện tử cơ bản',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        // Insert categories
        const categoryResult = await db.collection('tutorial_categories').insertMany(categories);
        console.log('✅ Inserted categories:', categoryResult.insertedIds);
        
        // Get category IDs
        const insertedCategories = await db.collection('tutorial_categories').find({}).toArray();
        const categoryMap = {};
        insertedCategories.forEach(cat => {
            categoryMap[cat.name] = cat._id;
        });
        
        // Sample tutorials
        const tutorials = [
            {
                title: 'Làm quen với Scratch - Bài 1',
                content: `# Làm quen với Scratch

## Giới thiệu
Scratch là một ngôn ngữ lập trình trực quan được thiết kế đặc biệt cho trẻ em và người mới bắt đầu học lập trình.

## Mục tiêu bài học
- Hiểu được giao diện Scratch
- Tạo nhân vật đầu tiên
- Lập trình chuyển động cơ bản

## Nội dung chi tiết

### 1. Giao diện Scratch
Scratch có giao diện thân thiện với các khối lệnh màu sắc:
- **Khối chuyển động**: Màu xanh dương
- **Khối ngoại hình**: Màu tím
- **Khối âm thanh**: Màu tím nhạt
- **Khối sự kiện**: Màu vàng

### 2. Tạo nhân vật
1. Click vào "Chọn nhân vật"
2. Chọn nhân vật từ thư viện
3. Hoặc vẽ nhân vật mới

### 3. Lập trình chuyển động
Kéo thả các khối lệnh:
- "di chuyển 10 bước"
- "quay 15 độ"
- "nhảy đến vị trí ngẫu nhiên"

## Bài tập thực hành
Tạo một chương trình để nhân vật di chuyển theo hình vuông.`,
                author: 'Nguyễn Văn A',
                categoryId: categoryMap['Lập trình Scratch'],
                slug: 'lam-quen-voi-scratch-bai-1',
                description: 'Học cách sử dụng Scratch để tạo chương trình đầu tiên',
                difficulty: 'beginner',
                duration: 30,
                tags: ['scratch', 'lập trình', 'cơ bản'],
                isPublished: true,
                featuredImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
                videoUrl: 'https://www.youtube.com/watch?v=example1',
                views: 150,
                likes: 25,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                title: 'Arduino LED Blink - Bài 1',
                content: `# Arduino LED Blink - Bài 1

## Giới thiệu
Trong bài học này, chúng ta sẽ học cách làm cho LED nhấp nháy bằng Arduino.

## Vật liệu cần thiết
- Arduino Uno
- LED
- Điện trở 220Ω
- Dây nối
- Breadboard

## Sơ đồ mạch
```
Arduino Pin 13 → Điện trở 220Ω → LED (+) → LED (-) → GND
```

## Code Arduino
\`\`\`cpp
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
\`\`\`

## Giải thích code
- \`pinMode(13, OUTPUT)\`: Đặt pin 13 là output
- \`digitalWrite(13, HIGH)\`: Bật LED (HIGH = 5V)
- \`digitalWrite(13, LOW)\`: Tắt LED (LOW = 0V)
- \`delay(1000)\`: Chờ 1000ms = 1 giây

## Bài tập mở rộng
1. Thay đổi tốc độ nhấp nháy
2. Thêm nhiều LED
3. Tạo hiệu ứng nhấp nháy khác nhau`,
                author: 'Trần Thị B',
                categoryId: categoryMap['Arduino Cơ bản'],
                slug: 'arduino-led-blink-bai-1',
                description: 'Học cách lập trình Arduino để điều khiển LED nhấp nháy',
                difficulty: 'beginner',
                duration: 45,
                tags: ['arduino', 'led', 'điện tử'],
                isPublished: true,
                featuredImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
                videoUrl: 'https://www.youtube.com/watch?v=example2',
                views: 200,
                likes: 35,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                title: 'Robot điều khiển từ xa',
                content: `# Robot điều khiển từ xa

## Giới thiệu
Xây dựng robot có thể điều khiển từ xa bằng smartphone.

## Vật liệu
- Arduino Uno
- Module Bluetooth HC-05
- Motor driver L298N
- 2 động cơ DC
- Khung robot
- Pin 9V

## Kết nối
- HC-05 VCC → Arduino 5V
- HC-05 GND → Arduino GND
- HC-05 TX → Arduino Pin 2
- HC-05 RX → Arduino Pin 3

## Code Arduino
\`\`\`cpp
#include <SoftwareSerial.h>

SoftwareSerial bluetooth(2, 3);

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);
  pinMode(4, OUTPUT); // Motor 1
  pinMode(5, OUTPUT);
  pinMode(6, OUTPUT); // Motor 2
  pinMode(7, OUTPUT);
}

void loop() {
  if (bluetooth.available()) {
    char command = bluetooth.read();
    
    switch(command) {
      case 'F': // Tiến
        forward();
        break;
      case 'B': // Lùi
        backward();
        break;
      case 'L': // Trái
        left();
        break;
      case 'R': // Phải
        right();
        break;
      case 'S': // Dừng
        stop();
        break;
    }
  }
}

void forward() {
  digitalWrite(4, HIGH);
  digitalWrite(5, LOW);
  digitalWrite(6, HIGH);
  digitalWrite(7, LOW);
}
\`\`\`

## Ứng dụng Android
Sử dụng app "Arduino Bluetooth Controller" để điều khiển.`,
                author: 'Lê Văn C',
                categoryId: categoryMap['Arduino Cơ bản'],
                slug: 'robot-dieu-khien-tu-xa',
                description: 'Học cách xây dựng robot điều khiển từ xa bằng Bluetooth',
                difficulty: 'intermediate',
                duration: 120,
                tags: ['arduino', 'robot', 'bluetooth', 'điều khiển'],
                isPublished: true,
                featuredImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
                videoUrl: 'https://www.youtube.com/watch?v=example3',
                views: 300,
                likes: 50,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        // Insert tutorials
        const tutorialResult = await db.collection('tutorials').insertMany(tutorials);
        console.log('✅ Inserted tutorials:', tutorialResult.insertedIds);
        
        console.log('🎉 Sample data seeded successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding data:', error);
    } finally {
        await client.close();
    }
}

seedTutorials();
