// ==================== 完整工作流 ====================

// 1. 用户上传技能 -> 待审核
async function uploadSkill(skillData) {
  const { data, error } = await supabase
    .from('skills')
    .insert([{
      name: skillData.name,
      type: skillData.type,
      description: skillData.description,
      tags: skillData.tags,
      status: 'pending',
      power_reward: 10
    }])
    .select()
    .single();
  
  if (error) return { success: false, error: error.message };
  
  return { success: true, data, message: '已提交，等待审核'};
}

// 2. 管理员获取待审核列表
async function getPendingSkills() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  return data || [];
}

// 3. 管理员审核通过
async function approveSkill(skillId) {
  // 更新状态
  const { error } = await supabase
    .from('skills')
    .update({ status: 'approved' })
    .eq('id', skillId);
  
  if (error) return { success: false };
  
  // 获取技能信息
  const { data: skill } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single();
  
  // 奖励算力（这里简化，实际应该奖励给创作者）
  await supabase.from('power_logs').insert([{
    user_id: 'system',
    action: 'skill_approved',
    amount: skill.power_reward,
    description: `技能审核通过: ${skill.name}`
  }]);
  
  return { success: true };
}

// 4. 管理员审核拒绝
async function rejectSkill(skillId, reason) {
  const { error } = await supabase
    .from('skills')
    .update({ status: 'rejected' })
    .eq('id', skillId);
  
  return { success: !error };
}

// 5. 用户查看自己的上传
async function getMyUploads() {
  const userId = localStorage.getItem('lobster_user_id');
  if (!userId) return [];
  
  const { data } = await supabase
    .from('skills')
    .select('*')
    .order('created_at', { ascending: false });
  
  return data || [];
}

// 6. 技能下架
async function offlineSkill(skillId) {
  const { error } = await supabase
    .from('skills')
    .update({ status: 'offline' })
    .eq('id', skillId);
  
  return { success: !error };
}

// ==================== 管理员界面渲染 ====================

// 渲染审核管理面板
async function renderAdminPanel() {
  const container = document.getElementById('admin-panel');
  if (!container) return;
  
  const pendingSkills = await getPendingSkills();
  
  if (pendingSkills.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;">暂无待审核技能</p>';
    return;
  }
  
  container.innerHTML = pendingSkills.map(skill => `
    <div class="review-card" id="skill-${skill.id}">
      <div class="review-header">
        <h4>${skill.name}</h4>
        <span class="tag">${skill.type}</span>
      </div>
      <p class="review-desc">${skill.description || '暂无描述'}</p>
      <div class="review-tags">
        ${(skill.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
      <div class="review-actions">
        <button class="btn-approve" onclick="handleApprove('${skill.id}')">✅ 通过</button>
        <button class="btn-reject" onclick="handleReject('${skill.id}')">❌ 拒绝</button>
      </div>
    </div>
  `).join('');
}

// 处理审核通过
async function handleApprove(skillId) {
  const result = await approveSkill(skillId);
  if (result.success) {
    alert('✅ 审核通过！');
    renderAdminPanel(); // 刷新列表
  } else {
    alert('❌ 操作失败');
  }
}

// 处理审核拒绝
async function handleReject(skillId) {
  const reason = prompt('请输入拒绝原因：');
  if (!reason) return;
  
  const result = await rejectSkill(skillId, reason);
  if (result.success) {
    alert('❌ 已拒绝');
    renderAdminPanel();
  }
}

// ==================== 用户状态查询 ====================

// 查询技能审核状态
async function checkSkillStatus(skillId) {
  const { data } = await supabase
    .from('skills')
    .select('status, status_message')
    .eq('id', skillId)
    .single();
  
  return data;
}

// 监听审核状态变化（轮询）
function watchSkillStatus(skillId, callback) {
  return setInterval(async () => {
    const status = await checkSkillStatus(skillId);
    if (status && status.status !== 'pending') {
      callback(status);
    }
  }, 10000); // 每10秒检查一次
}

// ==================== 改进的上传流程 ====================

async function handleSkillUpload(event) {
  event.preventDefault();
  
  const form = event.target;
  const skillData = {
    name: form.skillName.value,
    type: form.skillType.value,
    description: form.skillDesc.value,
    tags: form.skillTags ? form.skillTags.value.split(',').map(t => t.trim()) : []
  };
  
  // 显示加载状态
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '上传中...';
  
  const result = await uploadSkill(skillData);
  
  btn.disabled = false;
  btn.textContent = '🚀 上传技能';
  
  if (result.success) {
    alert(`🎉 提交成功！\n\n技能已提交审核，审核通过后：\n- 技能将自动上架\n- 你将获得 ${skillData.power_reward || 10} 算力奖励\n- 可在"我的上传"中查看进度`);
    form.reset();
    
    // 开始监听审核状态
    const skillId = result.data.id;
    watchSkillStatus(skillId, (status) => {
      if (status.status === 'approved') {
        alert(`🎊 你的技能 "${skillData.name}" 已通过审核！`);
      } else if (status.status === 'rejected') {
        alert(`😢 你的技能 "${skillData.name}" 未通过审核: ${status.status_message || '请联系管理员'}`);
      }
    });
  } else {
    alert('❌ 上传失败: ' + result.error);
  }
}

// ==================== 初始化 ====================

// 自动初始化（如果页面有对应元素）
document.addEventListener('DOMContentLoaded', () => {
  // 绑定上传表单
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleSkillUpload);
  }
  
  // 如果是管理员，显示审核面板
  const isAdmin = localStorage.getItem('lobster_admin') === 'true';
  if (isAdmin) {
    renderAdminPanel();
  }
});
