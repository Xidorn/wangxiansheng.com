const CONFIG = {
    startYear: 2008,
    requestTimeout: 5000,
    api: {
        whois: 'https://api.mrwang.com/whois.php?domain=',
        contact: 'https://lianxi.wangxiansheng.com/hezuo.php'
    }
};

const byId = (id) => document.getElementById(id);
const queryAll = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderWhoisDomainLink(domain) {
    const normalizedDomain = getWhoisDomain(domain);

    if (!normalizedDomain) {
        return '--';
    }

    return `<a href="https://chayuming.wangxiansheng.com/${encodeURIComponent(normalizedDomain)}" target="_blank" rel="noopener noreferrer">${escapeHtml(normalizedDomain.toUpperCase())}</a>`;
}
function setFooterYear() {
    const yearElement = byId('footer-year');
    if (yearElement) {
        yearElement.textContent = `${CONFIG.startYear}-${new Date().getFullYear()}`;
    }
}

function setExperienceYears() {
    const yearElement = byId('experience-years');
    if (!yearElement) return;

    const startYear = Number(yearElement.dataset.startYear || CONFIG.startYear);
    const currentYear = new Date().getFullYear();
    const years = Math.max(0, currentYear - startYear);

    yearElement.textContent = `${years}+`;
}

function openModal(modalId) {
    const modal = byId(modalId);
    if (!modal) return;

    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = byId(modalId);
    if (!modal) return;

    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
}

function bindModalTriggers() {
    queryAll('[data-modal-target]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            openModal(trigger.dataset.modalTarget);
        });
    });

    queryAll('[data-modal-close]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            closeModal(trigger.dataset.modalClose);
        });
    });

    queryAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function switchSponsorPay(type) {
    queryAll('.sponsor-tab').forEach((button) => {
        button.classList.toggle('sponsor-tab--active', button.dataset.payType === type);
    });

    queryAll('.sponsor-qr').forEach((image) => {
        image.classList.toggle('sponsor-qr--active', image.id === `sponsor-qr-${type}`);
    });

    const tipElement = byId('sponsor-pay-tip');
    if (tipElement) {
        tipElement.textContent = `使用${type === 'alipay' ? '支付宝' : '微信'}扫码`;
    }
}

function bindSponsorTabs() {
    queryAll('.sponsor-tab').forEach((button) => {
        button.addEventListener('click', () => {
            switchSponsorPay(button.dataset.payType);
        });
    });
}

function normalizeWhoisData(rawData) {
    const data = rawData || {};

    return {
        unknown: data.unknown === true,
        reserved: data.reserved === true,
        registered: data.registered === true,
        domain: data.domain || '',
        registrar: data.registrar || '',
        creationDate: data.creationDate || '',
        creationDateIso: data.creationDateISO8601 || '',
        expirationDate: data.expirationDate || '',
        expirationDateIso: data.expirationDateISO8601 || '',
        updatedDate: data.updatedDate || '',
        updatedDateIso: data.updatedDateISO8601 || '',
        status: Array.isArray(data.status) ? data.status : [],
        nameServers: Array.isArray(data.nameServers) ? data.nameServers : [],
        age: data.createdAgo || data.age || '',
        remaining: data.expiresIn || data.remaining || '',
        gracePeriod: data.gracePeriod === true,
        redemptionPeriod: data.redemptionPeriod === true,
        pendingDelete: data.pendingDelete === true
    };
}

function formatDomainDuration(duration, kind) {
    if (!duration || duration === 'null') {
        return '--';
    }

    const rawValue = String(duration).trim();
    const isExpired = rawValue.startsWith('-') || rawValue === '0D';
    const normalizedValue = rawValue.replace(/^-/, '');
    const yearMatch = normalizedValue.match(/(\d+)Y/);
    const monthMatch = normalizedValue.match(/(\d+)Mo/);
    const dayMatch = normalizedValue.match(/(\d+)D/);
    const yearIncluded = Boolean(yearMatch);
    const monthIncluded = Boolean(monthMatch);
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;

    const parts = [];
    if (yearMatch) parts.push(`<span class="whois-duration__part"><b>${yearMatch[1]}</b><span>年</span></span>`);
    if (monthMatch) parts.push(`<span class="whois-duration__part"><b>${monthMatch[1]}</b><span>月</span></span>`);
    if (dayMatch) parts.push(`<span class="whois-duration__part"><b>${dayMatch[1]}</b><span>天</span></span>`);

    const formattedValue = parts.length
        ? `<span class="whois-duration">${parts.join('')}</span>`
        : '--';

    if (kind === 'age' && !yearIncluded && !monthIncluded && days < 7) {
        return `${formattedValue}<span class="status-badge status-badge--recent">最近注册</span>`;
    }

    if (kind === 'remaining') {
        if (isExpired) {
            return `<span class="status-badge status-badge--error">已过期 ${formattedValue}</span>`;
        }

        if (!yearIncluded && !monthIncluded && days < 7) {
            return `${formattedValue}<span class="status-badge status-badge--warning">即将到期</span>`;
        }
    }

    return formattedValue;
}

function formatChinaDate(value) {
    if (!value || value === 'null') {
        return '--';
    }

    const rawValue = String(value).trim();

    try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
            return rawValue;
        }

        let dateObject;
        if (/(Z|[+-]\d{2}:\d{2})$/.test(rawValue)) {
            dateObject = new Date(rawValue);
        } else if (/^\d{4}-\d{2}-\d{2}T/.test(rawValue)) {
            dateObject = new Date(`${rawValue}Z`);
        } else {
            dateObject = new Date(rawValue);
        }

        if (Number.isNaN(dateObject.getTime())) {
            return rawValue.split('T')[0] || rawValue;
        }

        const chinaDate = new Date(dateObject.getTime() + 8 * 60 * 60 * 1000);
        const year = chinaDate.getUTCFullYear();
        const month = String(chinaDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(chinaDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        return rawValue.split('T')[0] || rawValue;
    }
}

function buildWhoisStatusList(whoisData) {
    const statusList = Array.isArray(whoisData.status) ? [...whoisData.status] : [];

    if (whoisData.gracePeriod) statusList.push({ text: 'gracePeriod' });
    if (whoisData.redemptionPeriod) statusList.push({ text: 'redemptionPeriod' });
    if (whoisData.pendingDelete) statusList.push({ text: 'pendingDelete' });

    return statusList;
}

function updateWhoisField(id, value, allowHtml = false) {
    const element = byId(id);
    if (!element) return;

    if (allowHtml) {
        element.innerHTML = value;
    } else {
        element.textContent = value;
    }
}

function setWhoisLoadingState(domain) {
    const loader = '<i class="fa-solid fa-ellipsis fa-fade"></i>';
    const displayDomain = getWhoisDomain(domain);

    updateWhoisField('whois-domain', renderWhoisDomainLink(displayDomain), true);
    updateWhoisField('whois-age', loader, true);
    updateWhoisField('whois-remaining', loader, true);
    updateWhoisField('whois-registrar', loader, true);
    updateWhoisField('whois-created-at', loader, true);
    updateWhoisField('whois-updated-at', loader, true);
    updateWhoisField('whois-expires-at', loader, true);
    updateWhoisField('whois-status-list', loader, true);
    updateWhoisField('whois-name-servers', loader, true);

    const progressBar = byId('whois-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

function renderWhoisStatusBadges(statusItems) {
    if (!statusItems.length) {
        return '<span class="status-badge status-badge--neutral">OK</span>';
    }

    return statusItems
        .map((statusItem) => {
            const rawText = typeof statusItem === 'string' ? statusItem : statusItem.text || '';
            const text = rawText.split(' ')[0] || 'ok';
            return `<span class="status-badge">${text}</span>`;
        })
        .join('');
}

async function openWhois(domain) {
    const whoisDomain = getWhoisDomain(domain);

    if (!whoisDomain) return;

    setWhoisLoadingState(whoisDomain);
    openModal('modal-whois');

    try {
        const response = await fetch(`${CONFIG.api.whois}${encodeURIComponent(whoisDomain)}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!(result.code === 0 && result.data)) {
            throw new Error(result && result.msg ? result.msg : 'API Error');
        }

        const whoisData = normalizeWhoisData(result.data);

        if (whoisData.unknown) {
            updateWhoisField('whois-age', '--');
            updateWhoisField('whois-remaining', '--');
            updateWhoisField('whois-registrar', '--');
            updateWhoisField('whois-created-at', '--');
            updateWhoisField('whois-updated-at', '--');
            updateWhoisField('whois-expires-at', '--');
            updateWhoisField('whois-status-list', '<span class="status-badge status-badge--error">unknown</span>', true);
            updateWhoisField('whois-name-servers', '该域名暂时无法识别或暂不支持查询');
            return;
        }

        if (!whoisData.registered) {
            updateWhoisField('whois-age', '未注册');
            updateWhoisField('whois-remaining', whoisData.reserved ? '已保留' : '可注册');
            updateWhoisField('whois-registrar', whoisData.reserved ? '保留域名' : '--');
            updateWhoisField('whois-created-at', '--');
            updateWhoisField('whois-updated-at', '--');
            updateWhoisField('whois-expires-at', '--');
            updateWhoisField(
                'whois-status-list',
                whoisData.reserved
                    ? '<span class="status-badge status-badge--warning">reserved</span>'
                    : '<span class="status-badge status-badge--recent">available</span>',
                true
            );
            updateWhoisField('whois-name-servers', whoisData.reserved ? '该域名已被保留' : '该域名尚未被注册');
            return;
        }

        const start = new Date(whoisData.creationDateIso || whoisData.creationDate).getTime();
        const end = new Date(whoisData.expirationDateIso || whoisData.expirationDate).getTime();
        const progress = Number.isFinite(start) && Number.isFinite(end) && end > start
            ? Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
            : 0;

        const progressBar = byId('whois-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        updateWhoisField('whois-age', formatDomainDuration(whoisData.age, 'age'), true);
        updateWhoisField('whois-remaining', formatDomainDuration(whoisData.remaining, 'remaining'), true);
        updateWhoisField('whois-registrar', whoisData.registrar || '未知');
        updateWhoisField('whois-created-at', formatChinaDate(whoisData.creationDateIso || whoisData.creationDate));
        updateWhoisField('whois-updated-at', formatChinaDate(whoisData.updatedDateIso || whoisData.updatedDate));
        updateWhoisField('whois-expires-at', formatChinaDate(whoisData.expirationDateIso || whoisData.expirationDate));
        updateWhoisField('whois-status-list', renderWhoisStatusBadges(buildWhoisStatusList(whoisData)), true);
        updateWhoisField(
            'whois-name-servers',
            whoisData.nameServers.length ? whoisData.nameServers.join('\n').toLowerCase() : '-'
        );
    } catch (error) {
        updateWhoisField('whois-age', '--');
        updateWhoisField('whois-remaining', '--');
        updateWhoisField('whois-registrar', '--');
        updateWhoisField('whois-created-at', '--');
        updateWhoisField('whois-updated-at', '--');
        updateWhoisField('whois-expires-at', '--');
        updateWhoisField('whois-status-list', '<span class="status-badge status-badge--error">error</span>', true);
        updateWhoisField('whois-name-servers', '查询失败');

        const progressBar = byId('whois-progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }
}

function bindWhoisButtons() {
    queryAll('[data-whois-domain]').forEach((button) => {
        button.addEventListener('click', () => {
            openWhois(button.dataset.whoisDomain);
        });
    });
}

function normalizeExternalUrl(value) {
    const rawUrl = String(value || '').trim();

    try {
        const url = new URL(rawUrl, window.location.origin);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return '';
        }

        return url.href;
    } catch (error) {
        return '';
    }
}

function getDisplayDomain(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname.replace(/^www\./i, '');
    } catch (error) {
        return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
    }
}

function getHostname(value) {
    const rawValue = String(value || '').trim();

    if (!rawValue) return '';

    try {
        return new URL(rawValue).hostname.toLowerCase();
    } catch (error) {
        return rawValue
            .replace(/^https?:\/\//i, '')
            .replace(/\/.*$/, '')
            .replace(/:\d+$/, '')
            .toLowerCase();
    }
}

function getRegistrableDomain(hostname) {
    const normalizedHost = String(hostname || '')
        .trim()
        .toLowerCase()
        .replace(/^www\./i, '')
        .replace(/\.$/, '');

    if (!normalizedHost) return '';

    const parts = normalizedHost.split('.').filter(Boolean);

    if (parts.length <= 2 || /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHost)) {
        return normalizedHost;
    }

    const compoundSuffixes = [
        'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
        'com.hk', 'net.hk', 'org.hk',
        'com.tw', 'net.tw', 'org.tw',
        'co.uk', 'org.uk', 'ac.uk',
        'com.au', 'net.au', 'org.au',
        'co.jp', 'ne.jp', 'or.jp',
        'co.kr', 'or.kr', 'ne.kr',
        'co.nz', 'org.nz', 'net.nz',
        'com.sg', 'net.sg', 'org.sg',
        'com.my', 'com.br', 'com.tr', 'com.mx'
    ];

    const matchedSuffix = compoundSuffixes.find((suffix) => normalizedHost.endsWith(`.${suffix}`));

    if (matchedSuffix) {
        const suffixParts = matchedSuffix.split('.').length;
        return parts.slice(-(suffixParts + 1)).join('.');
    }

    return parts.slice(-2).join('.');
}

function getWhoisDomain(url) {
    return getRegistrableDomain(getHostname(url));
}

function normalizeIconClass(value) {
    const iconClass = String(value || '').trim();
    return /^[a-zA-Z0-9\s_-]+$/.test(iconClass) ? iconClass : 'fas fa-link';
}

function renderPersonalSites() {
    const dataElement = byId('personal-sites-json');
    const listElement = byId('personal-sites-list');

    if (!dataElement || !listElement) return;

    let data;
    try {
        data = JSON.parse(dataElement.textContent || '{}');
    } catch (error) {
        listElement.innerHTML = '';
        return;
    }

    const items = Array.isArray(data.itemListElement) ? data.itemListElement : [];

    listElement.innerHTML = items
        .map((item) => {
            const url = normalizeExternalUrl(item.url);
            if (!url) return '';

            const name = String(item.name || '').trim() || getDisplayDomain(url);
            const displayDomain = getDisplayDomain(url);
            const description = String(item.description || '').trim() || displayDomain;
            const whoisDomain = getWhoisDomain(url);
            const iconClass = normalizeIconClass(item.icon);

            return `
                    <div class="site-card">
                        <div class="contact-card site-status" data-site-url="${escapeHtml(url)}">
                            <div class="contact-card__icon">
                                <i class="${escapeHtml(iconClass)}"></i>
                                <span class="status-indicator status-indicator--checking"></span>
                            </div>
                            <div class="contact-card__body">
                                <h3 class="contact-card__label">
                                    <a href="${escapeHtml(url)}" class="contact-card__text-link" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>
                                </h3>
                                <p class="contact-card__value">${escapeHtml(description)}</p>
                            </div>
                        </div>
                        <button type="button" class="site-card__whois-button" data-whois-domain="${escapeHtml(whoisDomain)}" aria-label="查询 ${escapeHtml(whoisDomain)} 的 Whois 信息">
                            <i class="fas fa-fingerprint"></i>
                        </button>
                    </div>`;
        })
        .join('');
}

async function checkWebsiteStatus() {
    const siteLinks = queryAll('.site-status');

    await Promise.all(
        siteLinks.map(async (siteLink) => {
            const statusIndicator = siteLink.querySelector('.status-indicator');
            if (!statusIndicator) return;

            const statusUrl = siteLink.dataset.siteUrl || siteLink.href;
            if (!statusUrl) return;

            const controller = new AbortController();
            const timeoutTimer = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

            try {
                await fetch(statusUrl, {
                    mode: 'no-cors',
                    cache: 'no-cache',
                    signal: controller.signal
                });

                statusIndicator.className = 'status-indicator status-indicator--online';
            } catch (error) {
                statusIndicator.className = 'status-indicator status-indicator--offline';
            } finally {
                clearTimeout(timeoutTimer);
            }
        })
    );
}

function setContactResult(message, isSuccess) {
    const resultElement = byId('contact-result');
    if (!resultElement) return;

    resultElement.textContent = message;
    resultElement.className = `contact-form__result is-visible ${isSuccess ? 'contact-form__result--success' : 'contact-form__result--error'}`;
}

async function getPublicIp() {
    const endpoints = [
        'https://api64.ipify.org?format=json',
        'https://api.ipify.org?format=json'
    ];

    for (const url of endpoints) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store'
            });
            const data = await response.json();
            if (data && data.ip) {
                return data.ip;
            }
        } catch (error) {
            // try next endpoint
        }
    }

    throw new Error('公网 IP 获取失败');
}

function getBrowserInfo() {
    const nav = window.navigator || {};
    const screenInfo = window.screen || {};
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;

    return {
        user_agent: nav.userAgent || '',
        language: nav.language || '',
        languages: Array.isArray(nav.languages) ? nav.languages.join(', ') : '',
        platform: nav.platform || '',
        cookie_enabled: typeof nav.cookieEnabled === 'boolean' ? nav.cookieEnabled : '',
        do_not_track: nav.doNotTrack || window.doNotTrack || '',
        hardware_concurrency: nav.hardwareConcurrency || '',
        device_memory: nav.deviceMemory || '',
        max_touch_points: nav.maxTouchPoints || '',
        screen_width: screenInfo.width || '',
        screen_height: screenInfo.height || '',
        color_depth: screenInfo.colorDepth || '',
        pixel_ratio: window.devicePixelRatio || '',
        viewport_width: window.innerWidth || '',
        viewport_height: window.innerHeight || '',
        timezone,
        referrer: document.referrer || '',
        page_url: window.location.href,
        page_path: window.location.pathname,
        hostname: window.location.hostname,
        online: typeof nav.onLine === 'boolean' ? nav.onLine : '',
        connection_type: connection && connection.effectiveType ? connection.effectiveType : '',
        timestamp: new Date().toISOString()
    };
}

function buildContactPayload(publicIp) {
    return {
        name: byId('contact-name')?.value.trim() || '',
        contactInfo: byId('contact-info')?.value.trim() || '',
        email: byId('contact-email')?.value.trim() || '',
        company: byId('contact-company')?.value.trim() || '',
        industry: byId('contact-industry')?.value.trim() || '',
        subject: byId('contact-subject')?.value.trim() || '',
        siteStage: byId('contact-site-stage')?.value.trim() || '',
        website: byId('contact-website')?.value.trim() || '',
        market: byId('contact-market')?.value.trim() || '',
        message: byId('contact-message')?.value.trim() || '',
        client_ip: publicIp,
        user_agent: navigator.userAgent || '',
        browser_info: JSON.stringify(getBrowserInfo())
    };
}

function validateContactPayload(payload) {
    return Boolean(payload.name && payload.contactInfo && payload.industry && payload.subject && payload.message);
}

async function bindContactForm() {
    const formElement = byId('contact-form');
    const submitButton = byId('contact-submit');
    const ipStatusElement = byId('contact-ip-status');

    if (!formElement || !submitButton || !ipStatusElement) return;

    let currentIp = '';

    ipStatusElement.textContent = '正在获取网络环境信息...';
    try {
        currentIp = await getPublicIp();
        ipStatusElement.textContent = '网络环境校验完成，可正常提交表单。';
    } catch (error) {
        currentIp = '';
        ipStatusElement.textContent = '网络环境信息获取失败，请检查网络后重试。';
    }

    formElement.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentIp) {
            setContactResult('网络环境信息尚未获取成功，暂时不能提交。', false);
            return;
        }

        const payload = buildContactPayload(currentIp);
        if (!validateContactPayload(payload)) {
            setContactResult('请填写所有必填字段。', false);
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = '提交中...';

        try {
            const response = await fetch(CONFIG.api.contact, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const rawText = await response.text();
            let result;

            try {
                result = JSON.parse(rawText);
            } catch (error) {
                setContactResult('提交失败，请稍后重试。', false);
                return;
            }

            if (response.ok && result.success === true) {
                setContactResult(result.message || '提交成功，我们会尽快与您联系。', true);
                formElement.reset();
            } else {
                setContactResult(result.message || '提交失败，请稍后再试。', false);
            }
        } catch (error) {
            setContactResult(`请求失败：${error.message}`, false);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '提交咨询';
        }
    });
}

function animatePanelEntrance() {
    const panelElement = byId('site-panel');
    if (!panelElement) return;

    window.setTimeout(() => {
        panelElement.style.opacity = '1';
        panelElement.style.transform = 'translateY(0)';
    }, 150);
}

window.openWhois = openWhois;
window.openModal = openModal;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', async () => {
    setFooterYear();
    setExperienceYears();
    animatePanelEntrance();
    bindModalTriggers();
    bindPageMenuToggle();
    bindSponsorTabs();
    renderPersonalSites();
    bindWhoisButtons();
    await bindContactForm();
    void checkWebsiteStatus();
});

function bindPageMenuToggle() {
    const toggleButton = document.querySelector('.page-menu-toggle');
    const navElement = document.querySelector('.page-nav');

    if (!toggleButton || !navElement) return;

    const mobileQuery = window.matchMedia('(max-width: 820px)');

    const setMenuState = (isOpen) => {
        navElement.classList.toggle('is-open', isOpen);
        toggleButton.classList.toggle('is-active', isOpen);
        toggleButton.setAttribute('aria-expanded', String(isOpen));
        toggleButton.setAttribute('aria-label', isOpen ? '收起导航菜单' : '展开导航菜单');
    };

    toggleButton.addEventListener('click', () => {
        setMenuState(!navElement.classList.contains('is-open'));
    });

    navElement.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            if (mobileQuery.matches) {
                setMenuState(false);
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (!mobileQuery.matches) return;
        if (!event.target.closest('.page-topbar')) {
            setMenuState(false);
        }
    });

    window.addEventListener('resize', () => {
        if (!mobileQuery.matches) {
            setMenuState(false);
        }
    });
}


function analytics() {
    var _hmt = _hmt || [];
    (function () {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?be6d24b9969e6282da3ffef0bb6db3e8";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
    })();
}