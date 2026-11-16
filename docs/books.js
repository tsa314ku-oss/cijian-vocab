// Add each future book dataset here after loading its vocabulary script.
// The original book keeps its existing word/unit IDs for progress compatibility.
window.CIJIAN_BOOKS=[{
 id:'ielts-3800',displayOrder:3,title:'雅思标准词汇 · 3800',shortTitle:'雅思词汇 3800',
 author:'刘薇',edition:'第 2 版',category:'雅思',coverLabel:'IELTS',coverTitle:'雅思\n标准词汇',
 description:'按原书 Day 学习单词，再按字母分组积累词组。',
 sourcesBase:'sources',preserveIds:true,data:window.VOCABULARY
}, {
 id:'cet6',displayOrder:1,title:'晓艳带你学英语 · 六级高频单词',shortTitle:'晓艳六级高频单词',edition:'原书 Unit 整理版',category:'英语六级',coverLabel:'CET-6',coverTitle:'晓艳带你\n学英语',
 description:'按《晓艳带你学英语·六级高频单词》原书 10 个 Unit 和顺序学习，重复词共享记录。',grouping:'个单词单元 · 按原书 Unit 分组',
 sourceNote:'来源：用户提供的《晓艳带你学英语·六级高频单词》。扫描识别整理，释义可能有误，可在词条学习中校对。',data:window.CIJIAN_XIAOYAN_CET6
}, {
 id:'postgraduate',displayOrder:2,title:'考研词汇',shortTitle:'考研词汇',edition:'考试标签整理版',category:'考研英语',coverLabel:'POSTGRAD',coverTitle:'考研英语\n核心词汇',
 description:'依据 ECDICT 考研标签整理，按词频每 100 词分组。重复词沿用已有学习记录。',grouping:'个单词单元 · 按词频分组',
 sourceNote:'来源：ECDICT 的 ky 标签（MIT 许可）。此整理版不等同于官方全量大纲。',data:window.CIJIAN_EXAM_BOOKS.ky
}, {
 id:'cet4',displayOrder:0,title:'大学英语四级词汇',shortTitle:'四级词汇',edition:'考试标签整理版',category:'英语四级',coverLabel:'CET-4',coverTitle:'大学英语\n四级词汇',
 description:'依据 ECDICT 四级标签整理，按词频每 100 词分组。相同单词沿用已有掌握度和学习记录。',grouping:'个单词单元 · 按词频分组',
 sourceNote:'来源：ECDICT 的 cet4 标签（MIT 许可），共 3,849 词。此整理版不等同于官方全量大纲。',data:window.CIJIAN_CET4
}];
