// 龙虾养殖基地 - Supabase 客户端
// 配置
const SUPABASE_URL = 'https://thpamcdbcfnmhvnmvhtc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocGFtY2RiY2ZubWh2bm12aHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTg5MTIsImV4cCI6MjA4NzczNDkxMn0.7Mgl8AE6au-ICi22U8R7u2MFQqKyd1EP0-a-PsC6c2w';

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 数据获取 ====================

// 获取创作者排行榜
async function getLeaderboard() {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .order('total_power', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('获取排行榜失败:', error);
    return [];
  }
  return data;
}

// 获取技能列表
async function getSkills(type = null) {
  let query = supabase
    .from('skills')
    .select('*')
    .eq('status', 'approved')
    .order('downloads', { ascending: false });
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query.limit(50);
  
  if (error) {
    console.error('获取技能失败:', error);
    return [];
  }
  return data;
}

// 获取统计数据
async function getStats() {
  const [creatorsRes, skillsRes] = await Promise.all([
    supabase.from('creators').select('count', { count: 'exact' }),
    supabase.from('skills').select('count', { count: 'exact' })
  ]);
  
  return {
    creatorCount: creatorsRes.count || 0,
    skillCount: skillsRes.count || 0,
    userCount: 1000 // 模拟
  };
}

// ==================== 数据写入 ====================

// 上传技能
async function uploadSkill(skillData) {
  // 生成随机创作者ID（简化版，实际应该走登录）
  const creatorId = localStorage.getItem('lobster_creator_id') || 'anonymous';
  
  const { data, error } = await supabase
    .from('skills')
    .insert([{
      creator_id: creatorId,
      name: skillData.name,
      type: skillData.type,
      description: skillData.description,
      tags: skillData.tags || [],
      status: 'pending', // 需要审核
      power_reward: 10
    }])
    .select();
  
  if (error) {
    console.error('上传失败:', error);
    return { success: false, error: error.message };
  }
  
  // 记录算力日志
  await supabase.from('power_logs').insert([{
    user_id: creatorId,
    action: 'upload',
    amount: 10,
    description: `上传技能: ${skillData.name}`
  }]);
  
  return { success: true, data };
}

// 记录下载
async function recordDownload(skillId) {
  // 增加下载次数
  await supabase.rpc('increment_downloads', { row_id: skillId });
  
  // 记录日志
  await supabase.from('power_logs').insert([{
    user_id: localStorage.getItem('lobster_user_id') || 'guest',
    action: 'download',
    amount: -1,
    description: `下载技能: ${skillId}`
  }]);
}

// ==================== UI 渲染 ====================

// 渲染排行榜
async function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  
  const leaders = await getLeaderboard();
  
  if (leaders.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;">暂无数据</p>';
    return;
  }
  
  const rankClasses = ['gold', 'silver', 'bronze', 'normal', 'normal'];
  
  container.innerHTML = leaders.map((leader, index) => `
    <div class="leaderboard-item">
      <div class="rank ${rankClasses[index] || 'normal'}">${index + 1}</div>
      <div class="info">
        <div class="name">🦞 ${leader.username}</div>
        <div class="skill-count">贡献 ${leader.skill_count} 个技能</div class="power">>
      <div>
      </div+${leader.total_power} 算    </div>
  `).join力</div>
('');
}

// 渲染 function renderSkills(type技能列表
async) {
  const = null container = document.getskills-grid');
 ElementById(' if (!container) return;
  
  const skills = await getSkills(type);
  
  const typeIcons = {
    '编程': '💻',
    '🔎',
    '搜索': '✍️',
   写作': ' '浏览器': '🌐',
    '记忆': '🧠',
    '设计': '🎨'
 const type  };
  
 Colors = {
    '编程': 'linear-gradient(135deg, #667eea, # 'linear-gradient(764ba2)',
135deg, #    '搜索':f093fb, #f5576c)',
    '写作': 'linear-gradient(135deg, #4facf2fe)',
fe, #00    '浏览器': 'linear-gradient(, #38f43e97b135deg, #9d7)',
    '记忆': 'linear-gradient(135deg, #fa709a, #fee140)',
    '设计': 'linear-gradient(135deg, #a8edea, #fed6e3)'
  };
  
  container.innerHTML = skills.map(skill => `
    <div class="card" onclick="viewSkill('${skill.id}')">
      <div class="card-icon" style="background: ${typeColors[skill.type] || typeColors['编程']}">
        ${typeIcons[skill.type] || '⚡'}
      </div>
      <h3>${skill.name}</h3>
      <p>${skill.description || '暂无描述'}</p>
      <div class="tags">
        ${(skill.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// 渲染统计数据
async function renderStats() {
  const stats = await getStats();
  
  // 更新页面的统计数字
  const statElements = document.querySelectorAll('.power-stat .value');
  if (statElements[0]) statElements[0].textContent = stats.creatorCount + '+';
  if (statElements[1]) statElements[1].textContent = stats.skillCount + '+';
  if (statElements[2]) statElements[2].textContent = stats.userCount + '+';
}

// ==================== 表单处理 ====================

// 处理技能上传
async function handleSkillUpload(event) {
  event.preventDefault();
  
  const form = event.target;
  const skillData = {
    name: form.skillName.value,
    type: form.skillType.value,
    description: form.skillDesc.value,
    tags: form.skillTags ? form.skillTags.value.split(',').map(t => t.trim()) : []
  };
  
  const result = await uploadSkill(skillData);
  
  if (result.success) {
    alert('🎉 感谢你的贡献！技能审核通过后将自动上架，并发放算力奖励！');
    form.reset();
  } else {
    alert('❌ 上传失败: ' + result.error);
  }
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
  // 渲染排行榜
  await renderLeaderboard();
  
  // 渲染技能
  await renderSkills();
  
  // 渲染统计
  await renderStats();
  
  // 绑定上传表单
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleSkillUpload);
  }
  
  console.log('🦞 龙虾养殖基地已连接到 Supabase');
});
