// إعداد الاتصال بـ Supabase
const SUPABASE_URL = "https://nbgqoggilutczmzqxydp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_T1PrZFkblKRTY5GfLoNjMQ_dM5hGAOF";

let supabaseClient;
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("🛑 مكتبة Supabase لم يتم تحميلها بعد.");
    }
} catch(e) {
    console.error("❌ خطأ في تشغيل مكتبة سوبابيز: ", e);
}

// دالة توليد رقم الفاتورة تلقائياً - معدلة لتشمل الثواني لمنع التكرار تماماً
function setAutomaticInvoiceId() {
    try {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); 
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const timestamp = now.getTime().toString().slice(-4); // استخدام آخر 4 أرقام من الوقت بدقة الملي ثانية
        const autoId = `INV-${year}${month}-${timestamp}`;
        
        const inputInvId = document.getElementById('inputInvId');
        const viewInvId = document.getElementById('viewInvId');
        
        if(inputInvId) inputInvId.value = autoId;
        if(viewInvId) viewInvId.innerText = autoId;
    } catch (err) {
        console.error("❌ خطأ أثناء توليد رقم الفاتورة:", err);
    }
}

// دالة تحديث المعاينة الحية للفاتورة
function updateInvoicePreview() {
    try {
        const name = document.getElementById('inputName')?.value || "";
        const phone = document.getElementById('inputPhone')?.value || "";
        const invId = document.getElementById('inputInvId')?.value || "";
        const eventDate = document.getElementById('inputEventDate')?.value || "";
        const desc = document.getElementById('inputDesc')?.value || "";
        
        const rate = parseFloat(document.getElementById('inputRate')?.value) || 0;
        const insurance = parseFloat(document.getElementById('inputInsurance')?.value) || 0;
        const paid = parseFloat(document.getElementById('inputPaid')?.value) || 0;

        const total = rate + insurance;
        const remaining = total - paid;

        if(document.getElementById('viewName')) document.getElementById('viewName').innerText = name || "-";
        if(document.getElementById('viewPhone')) document.getElementById('viewPhone').innerText = phone || "-";
        if(document.getElementById('viewInvId')) document.getElementById('viewInvId').innerText = invId || "توليد...";
        if(document.getElementById('viewEventDate')) document.getElementById('viewEventDate').innerText = eventDate || "-";
        if(document.getElementById('viewDesc')) document.getElementById('viewDesc').innerText = desc || "-";
        
        if(document.getElementById('viewRateTable')) document.getElementById('viewRateTable').innerText = rate.toFixed(3) + " ر.ع";
        if(document.getElementById('viewAmountTable')) document.getElementById('viewAmountTable').innerText = rate.toFixed(3) + " ر.ع";
        if(document.getElementById('viewSubtotal')) document.getElementById('viewSubtotal').innerText = rate.toFixed(3) + " ر.ع";
        if(document.getElementById('viewInsurance')) document.getElementById('viewInsurance').innerText = insurance.toFixed(3) + " ر.ع";
        if(document.getElementById('viewTotal')) document.getElementById('viewTotal').innerText = total.toFixed(3) + " ر.ع";
        if(document.getElementById('viewPaid')) document.getElementById('viewPaid').innerText = paid.toFixed(3) + " ر.ع";
        if(document.getElementById('viewRemaining')) document.getElementById('viewRemaining').innerText = remaining.toFixed(3) + " ر.ع";
    } catch (err) {
        console.error("❌ خطأ في تحديث المعاينة الحية:", err);
    }
}

// جلب بيانات لوحة التحكم
async function fetchDashboardData() {
    if (!supabaseClient) return;
    try {
        let { data: invoices, error } = await supabaseClient
            .from('invoices')
            .select(`
                id, invoice_number, event_date, insurance_amount, 
                subtotal_amount, total_amount, paid_amount, status,
                customers ( name, phone )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('dashboardTableBody');
        if (!tbody) return;

        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-[#8C7662]">لا توجد فواتير مسجلة حتى الآن في النظام 📥</td></tr>`;
            return;
        }

        let totalPaidSum = 0;
        let totalRemainingSum = 0;
        let totalInsuranceSum = 0;
        let tableHtml = "";

        invoices.forEach(inv => {
            const custName = inv.customers ? inv.customers.name : "-";
            const custPhone = inv.customers ? inv.customers.phone : "";
            const remaining = inv.total_amount - inv.paid_amount;
            
            totalPaidSum += inv.paid_amount;
            totalRemainingSum += remaining;
            totalInsuranceSum += inv.insurance_amount;

            const statusBadge = remaining <= 0 
                ? `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">مدفوعة بالكامل</span>`
                : `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">متبقي مستحق</span>`;

            tableHtml += `
                <tr class="hover:bg-[#FDFBF7]/80 text-[#5C3A21]">
                    <td class="p-3 font-bold">${inv.invoice_number}</td>
                    <td class="p-3">${custName}</td>
                    <td class="p-3 font-mono">${inv.event_date || "-"}</td>
                    <td class="p-3 font-bold">${inv.total_amount.toFixed(3)} ر.ع</td>
                    <td class="p-3 text-emerald-700">${inv.paid_amount.toFixed(3)} ر.ع</td>
                    <td class="p-3 text-amber-800 font-bold">${remaining.toFixed(3)} ر.ع</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-center">
                        <button onclick="quickWhatsApp('${custPhone}', '${custName}', '${inv.invoice_number}', '${inv.event_date}', '${remaining.toFixed(3)}')" class="bg-[#25D366] text-white px-2 py-1 rounded text-[10px] font-bold cursor-pointer">واتساب 💬</button>
                    </td>
                </tr>
            `;
        });

        document.getElementById('statTotalInvoices').innerText = invoices.length;
        document.getElementById('statTotalPaid').innerText = totalPaidSum.toFixed(3) + " ر.ع";
        document.getElementById('statTotalRemaining').innerText = totalRemainingSum.toFixed(3) + " ر.ع";
        document.getElementById('statTotalInsurance').innerText = totalInsuranceSum.toFixed(3) + " ر.ع";
        tbody.innerHTML = tableHtml;

    } catch (err) {
        console.error("❌ خطأ أثناء جلب بيانات لوحة التحكم:", err);
    }
}

// دالة حفظ الفاتورة
async function saveInvoiceToSupabase() {
    if (!supabaseClient) {
        alert("🛑 خطأ: اتصال قاعدة البيانات مقطوع!");
        return;
    }

    const btn = document.getElementById('btnSave');
    if(btn) {
        btn.innerText = "جاري الحفظ... ⏳";
        btn.disabled = true;
    }

    const name = document.getElementById('inputName').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const invId = document.getElementById('inputInvId').value;
    const eventDate = document.getElementById('inputEventDate').value;
    const desc = document.getElementById('inputDesc').value;
    
    if (!name || !phone) {
        alert("⚠️ خطأ: يرجى كتابة اسم العميل ورقم الهاتف أولاً.");
        if(btn) {
            btn.innerText = "حفظ الفاتورة في قاعدة البيانات 💾";
            btn.disabled = false;
        }
        return;
    }

    const rate = parseFloat(document.getElementById('inputRate').value) || 0;
    const insurance = parseFloat(document.getElementById('inputInsurance').value) || 0;
    const paid = parseFloat(document.getElementById('inputPaid').value) || 0;
    const total = rate + insurance;
    const remaining = total - paid;

    try {
        let { data: customer, error: custError } = await supabaseClient
            .from('customers')
            .upsert({ name: name, phone: phone }, { onConflict: 'phone' })
            .select()
            .single();

        if (custError) throw new Error(`بيانات العميل: ${custError.message}`);

        const { data: invoice, error: invError } = await supabaseClient
            .from('invoices')
            .insert({
                customer_id: customer.id,
                invoice_number: invId,
                event_date: eventDate,
                insurance_amount: insurance,
                subtotal_amount: rate,
                total_amount: total,
                paid_amount: paid,
                status: remaining <= 0 ? 'paid' : 'unpaid'
            })
            .select()
            .single();

        if (invError) throw new Error(`جدول الفواتير: ${invError.message}`);

        const { error: itemError } = await supabaseClient
            .from('invoice_items')
            .insert({
                invoice_id: invoice.id,
                item_description: desc,
                rate: rate,
                quantity: 1,
                amount: rate
            });

        if (itemError) throw new Error(`تفاصيل العناصر: ${itemError.message}`);

        alert(`🎉 تم حفظ الفاتورة ${invId} بنجاح.`);
        setAutomaticInvoiceId();
        updateInvoicePreview();
        fetchDashboardData();

    } catch (err) {
        console.error("❌ خطأ في الحفظ:", err);
        alert(`🛑 حدث خطأ أثناء الحفظ:\n${err.message}`);
    } finally {
        if(btn) {
            btn.innerText = "حفظ الفاتورة في قاعدة البيانات 💾";
            btn.disabled = false;
        }
    }
}

function quickWhatsApp(phone, name, invId, eventDate, remaining) {
    try {
        if (!phone) { alert("رقم الهاتف غير متوفر."); return; }
        const text = `مرحباً بك أخي ${name} في متجر زورة ✨\n\nنذكركم بفاتورة حجزكم رقم: ${invId}.\n📅 تاريخ المناسبة: ${eventDate}\n💰 المبلغ المتبقي المستحق هو: ${remaining} ر.ع.\n\nنشكر اختياركم لمتجر زورة وثقتكم بنا 🤍`;
        window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    } catch (err) {
        alert("فشل الواتساب: " + err.message);
    }
}

// دالة التشغيل الآمنة بعد تحميل شجرة DOM
function initializeApp() {
    setAutomaticInvoiceId();
    updateInvoicePreview();
    fetchDashboardData();

    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) {
        invoiceForm.addEventListener('input', updateInvoicePreview);
    }

    const btnSave = document.getElementById('btnSave');
    if (btnSave) btnSave.addEventListener('click', saveInvoiceToSupabase);

    const btnRefreshDash = document.getElementById('btnRefreshDash');
    if (btnRefreshDash) btnRefreshDash.addEventListener('click', fetchDashboardData);
    
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            try { window.print(); } catch (err) { alert(`🛑 فشل الطباعة: ${err.message}`); }
        });
    }

    const btnWhatsApp = document.getElementById('btnWhatsApp');
    if (btnWhatsApp) {
        btnWhatsApp.addEventListener('click', () => {
            try {
                const phone = document.getElementById('inputPhone').value.trim();
                const name = document.getElementById('inputName').value;
                const invId = document.getElementById('inputInvId').value;
                const eventDate = document.getElementById('inputEventDate').value;
                const rate = parseFloat(document.getElementById('inputRate').value) || 0;
                const insurance = parseFloat(document.getElementById('inputInsurance').value) || 0;
                const paid = parseFloat(document.getElementById('inputPaid').value) || 0;
                const remaining = (rate + insurance - paid).toFixed(3);
                
                if (!phone) { alert("⚠️ يرجى إدخال رقم واتساب العميل."); return; }

                const text = `مرحباً بك أخي ${name} في متجر زورة ✨\n\nتم إصدار فاتورة حجز مستلزمات الحفلة الخاصة بكم برقم: ${invId}.\n📅 تاريخ المناسبة: ${eventDate}\n💰 المبلغ المتبقي المستحق هو: ${remaining} ر.ع.\n\nنشكر اختياركم لمتجر زورة وثقتكم بنا 🤍`;
                window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
            } catch (err) { alert(`🛑 فشل الواتساب: ${err.message}`); }
        });
    }
}

// ننتظر تحميل السكريبتات بالكامل للتأكد من وجود مكتبة سوبابيز في الذاكرة
window.addEventListener('load', () => {
    // إعادة محاولة الربط في حال تأخرت مكتبة سوبابيز الأصلية في التحميل
    if (!supabaseClient && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    initializeApp();
});
