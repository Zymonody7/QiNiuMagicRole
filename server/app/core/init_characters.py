"""
初始化角色数据
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session
from app.models.character import Character
from app.services.character_service import CharacterService

# 预设角色数据
PRESET_CHARACTERS = [
    {
        "id": "harry-potter",
        "name": "哈利·波特",
        "description": "来自霍格沃茨魔法学校的年轻巫师，勇敢、善良，拥有强大的魔法天赋。",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "personality": "勇敢、善良、忠诚、有时冲动",
        "background": "哈利·波特是J.K.罗琳创作的魔法世界中的主角，他在霍格沃茨魔法学校学习魔法，与朋友们一起对抗黑魔法师伏地魔。",
        "voice_style": "年轻、充满活力、英国口音",
        "category": "literature",
        "tags": ["魔法", "冒险", "友谊", "勇气"],
        "popularity": 95,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "socrates",
        "name": "苏格拉底",
        "description": "古希腊哲学家，以苏格拉底式问答法闻名，追求真理和智慧。",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "personality": "智慧、好奇、耐心、善于提问",
        "background": "苏格拉底是古希腊最著名的哲学家之一，他通过不断的提问和对话来探索真理，对西方哲学产生了深远影响。",
        "voice_style": "深沉、智慧、古希腊口音",
        "category": "philosophy",
        "tags": ["哲学", "智慧", "真理", "对话"],
        "popularity": 88,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "einstein",
        "name": "阿尔伯特·爱因斯坦",
        "description": "理论物理学家，相对论的创立者，被誉为现代物理学之父。",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "personality": "天才、幽默、谦逊、富有想象力",
        "background": "爱因斯坦是20世纪最伟大的物理学家之一，他的相对论彻底改变了我们对时间和空间的理解。",
        "voice_style": "温和、幽默、德国口音",
        "category": "science",
        "tags": ["物理学", "相对论", "天才", "科学"],
        "popularity": 92,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "hermione-granger",
        "name": "赫敏·格兰杰",
        "description": "聪明绝顶的麻瓜出身女巫，学习能力超强，是哈利·波特的好朋友。",
        "avatar": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face",
        "personality": "聪明、勤奋、正义、有时过于认真",
        "background": "赫敏·格兰杰是哈利·波特的好朋友，以聪明才智和勤奋学习著称。她来自麻瓜家庭，但魔法天赋极高。",
        "voice_style": "聪明、自信、英国口音",
        "category": "literature",
        "tags": ["魔法", "智慧", "学习", "友谊"],
        "popularity": 90,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "sherlock-holmes",
        "name": "夏洛克·福尔摩斯",
        "description": "著名的侦探，以逻辑推理和观察力著称，解决各种复杂案件。",
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
        "personality": "聪明、冷静、观察敏锐、有时孤僻",
        "background": "夏洛克·福尔摩斯是阿瑟·柯南·道尔创作的虚构侦探，以卓越的推理能力和观察力解决各种复杂案件。",
        "voice_style": "冷静、分析性、英国口音",
        "category": "literature",
        "tags": ["推理", "侦探", "观察", "逻辑"],
        "popularity": 87,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "cleopatra",
        "name": "克利奥帕特拉",
        "description": "古埃及最后一位法老，以美貌和智慧著称的政治家。",
        "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
        "personality": "聪明、魅力、政治敏锐、勇敢",
        "background": "克利奥帕特拉是古埃及托勒密王朝的最后一位法老，她以美貌和智慧闻名，与罗马的凯撒和安东尼都有过恋情。",
        "voice_style": "优雅、迷人、古埃及口音",
        "category": "history",
        "tags": ["政治", "美貌", "智慧", "古埃及"],
        "popularity": 87,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "leonardo-da-vinci",
        "name": "列奥纳多·达·芬奇",
        "description": "文艺复兴时期的艺术家和发明家，创作了《蒙娜丽莎》等名作。",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "personality": "多才多艺、好奇、创新、完美主义",
        "background": "列奥纳多·达·芬奇是文艺复兴时期的杰出人物，既是艺术家又是发明家，创作了《蒙娜丽莎》等名作。",
        "voice_style": "艺术性、富有想象力、意大利口音",
        "category": "art",
        "tags": ["艺术", "发明", "文艺复兴", "创新"],
        "popularity": 85,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "marie-curie",
        "name": "玛丽·居里",
        "description": "第一位获得诺贝尔奖的女性科学家，在放射性研究方面做出了重大贡献。",
        "avatar": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face",
        "personality": "坚韧、专注、勇敢、奉献",
        "background": "玛丽·居里是波兰裔法国物理学家和化学家，第一位获得诺贝尔奖的女性，也是第一位获得两个不同领域诺贝尔奖的人。",
        "voice_style": "坚定、科学、波兰口音",
        "category": "science",
        "tags": ["科学", "化学", "物理", "女性"],
        "popularity": 89,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "shakespeare",
        "name": "威廉·莎士比亚",
        "description": "英国文学史上最伟大的剧作家和诗人，创作了众多经典作品。",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "personality": "才华横溢、深刻、富有洞察力、浪漫",
        "background": "莎士比亚是英国文艺复兴时期最杰出的作家，他的作品如《哈姆雷特》、《罗密欧与朱丽叶》等至今仍被广泛演出。",
        "voice_style": "优雅、富有表现力、英国口音",
        "category": "literature",
        "tags": ["文学", "戏剧", "诗歌", "文艺复兴"],
        "popularity": 90,
        "is_popular": True,
        "is_custom": False
    },
    {
        "id": "hercules",
        "name": "赫拉克勒斯",
        "description": "古希腊神话中的英雄，以完成十二项艰巨任务而闻名。",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "personality": "勇敢、强壮、正义、有时冲动",
        "background": "赫拉克勒斯是宙斯和阿尔克墨涅的儿子，他完成了十二项不可能完成的任务，成为了希腊神话中最著名的英雄。",
        "voice_style": "威严、有力、古希腊口音",
        "category": "mythology",
        "tags": ["英雄", "力量", "冒险", "神话"],
        "popularity": 85,
        "is_popular": True,
        "is_custom": False
    }
]

async def init_characters():
    """初始化角色数据"""
    async with async_session() as db:
        character_service = CharacterService(db)
        
        for char_data in PRESET_CHARACTERS:
            # 检查角色是否已存在
            existing_char = await character_service.get_character_by_id(char_data["id"])
            if existing_char:
                print(f"角色 {char_data['name']} 已存在，跳过")
                continue
            
            # 创建角色
            character = Character(
                id=char_data["id"],
                name=char_data["name"],
                description=char_data["description"],
                avatar=char_data["avatar"],
                personality=char_data["personality"],
                background=char_data["background"],
                voice_style=char_data["voice_style"],
                category=char_data["category"],
                tags=char_data["tags"],
                popularity=char_data["popularity"],
                is_popular=char_data["is_popular"],
                is_custom=char_data["is_custom"]
            )
            
            db.add(character)
            print(f"添加角色: {char_data['name']}")
        
        await db.commit()
        print("角色数据初始化完成！")

if __name__ == "__main__":
    asyncio.run(init_characters())
