// تكوين العميل وإعداد الاتصال بسوبابيز
const SUPABASE_URL = "https://nbgqoggilutczmzqxydp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_T1PrZFkblKRTY5GfLoNjMQ_dM5hGAOF";

let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) {
    console.error("❌ خطأ في تشغيل مكتبة سوبابيز: ", e);
    alert("⚠️ تنبيه: فشل الاتصال بمكتبة Supabase الأساسية.");
}

// دالة توليد رقم الفاتورة تلقائياً
function setAutomaticInvoiceId() {
    try {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); 
        const timestamp = now.getTime().toString().slice(-6); 
        const autoId = `INV-${year}${timestamp}`;
        
        document.getElementById('inputInvId').value = autoId;
        document.getElementById('viewInvId').innerText = autoId;
    } catch (err) {
        console.error("❌ خطأ أثناء توليد رقم الفاتورة:", err);
    }
}

// دالة تحديث المعاينة الحية للفاتورة
function updateInvoicePreview() {
    try {
        const name = document.getElementById('inputName').value;
        const phone = document.getElementById('inputPhone').value;
        const invId = document.getElementById('inputInvId').value;
        const eventDate = document.getElementById('inputEventDate').value;
        const desc = document.getElementById('inputDesc').value;
        
        const rate = parseFloat(document.getElementById('inputRate').value) || 0;
        const insurance = parseFloat(document.getElementById('inputInsurance').value) || 0;
        const paid = parseFloat(document.getElementById('inputPaid').value) || 0;

        const total = rate + insurance;
        const remaining = total - paid;

        document.getElementById('viewName').innerText = name || "-";
        document.getElementById('viewPhone').innerText = phone || "-";
        document.getElementById('viewInvId').innerText = invId || "توليد...";
        document.getElementById('viewEventDate').innerText = eventDate || "-";
        document.getElementById('viewDesc').innerText = desc || "-";
        
        document.getElementById('viewRateTable').innerText = rate.toFixed(3) + " ر.ع";
        document.getElementById('viewAmountTable').innerText = rate.toFixed(3) + " ر.ع";
        document.getElementById('viewSubtotal').innerText = rate.toFixed(3) + " ر.ع";
        document.getElementById('viewInsurance').innerText = insurance.toFixed(3) + " ر.ع";
        document.getElementById('viewTotal').innerText = total.toFixed(3) + " ر.ع";
        document.getElementById('viewPaid').innerText = paid.toFixed(3) + " ر.ع";
        document.getElementById('viewRemaining').innerText = remaining.toFixed(3) + " ر.ع";
    } catch (err) {
        console.error("❌ خطأ في تحديث المعاينة الحية:", err);
    }
}

// دالة جلب بيانات لوحة تحكم الإحصاءات والجدول من السحاب
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

// دالة حفظ الفاتورة في قاعدة البيانات
async function saveInvoiceToSupabase() {
    if (!supabaseClient) {
        alert("🛑 خطأ: لا يمكن الحفظ لأن اتصال قاعدة البيانات مقطوع تماماً!");
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.innerText = "جاري الحفظ... ⏳";
    btn.disabled = true;

    const name = document.getElementById('inputName').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const invId = document.getElementById('inputInvId').value;
    const eventDate = document.getElementById('inputEventDate').value;
    const desc = document.getElementById('inputDesc').value;
    
    if (!name || !phone) {
        alert("⚠️ خطأ في البيانات: يرجى كتابة اسم العميل ورقم الهاتف أولاً قبل الحفظ.");
        btn.innerText = "حفظ الفاتورة في قاعدة البيانات 💾";
        btn.disabled = false;
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

        if (custError) throw new Error(`مشكلة في بيانات العميل: ${custError.message}`);

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

        if (invError) throw new Error(`مشكلة في جدول الفواتير: ${invError.message}`);

        const { error: itemError } = await supabaseClient
            .from('invoice_items')
            .insert({
                invoice_id: invoice.id,
                item_description: desc,
                rate: rate,
                quantity: 1,
                amount: rate
            });

        if (itemError) throw new Error(`مشكلة في تفاصيل عناصر الفاتورة: ${itemError.message}`);

        alert(`🎉 ممتاز! تم حفظ الفاتورة ${invId} بنجاح في السحاب.`);
        setAutomaticInvoiceId();
        updateInvoicePreview();
        fetchDashboardData();

    } catch (err) {
        console.error("❌ خطأ شامل في عملية الحفظ:", err);
        alert(`🛑 حدث خطأ أثناء الحفظ:\n${err.message}`);
    } finally {
        btn.innerText = "حفظ الفاتورة في قاعدة البيانات 💾";
        btn.disabled = false;
    }
}

// دالة إرسال التنبيهات بالواتساب السريع من الجدول
function quickWhatsApp(phone, name, invId, eventDate, remaining) {
    try {
        if (!phone) { alert("رقم الهاتف غير متوفر."); return; }
        const text = `مرحباً بك أخي ${name} في متجر زورة ✨\n\nنذكركم بفاتورة حجزكم رقم: ${invId}.\n📅 تاريخ المناسبة: ${eventDate}\n💰 المبلغ المتبقي المستحق هو: ${remaining} ر.ع.\n\nنشكر اختياركم لمتجر زورة وثقتكم بنا 🤍`;
        window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    } catch (err) {
        alert("فشل التوجيه للواتساب: " + err.message);
    }
}

// إعداد مراقبي الأحداث (Event Listeners) عند تحميل الصفحة بالكامل
document.addEventListener("DOMContentLoaded", () => {
    setAutomaticInvoiceId();
    updateInvoicePreview();
    fetchDashboardData();

    // ربط المدخلات بالمعاينة الحية
    document.getElementById('invoiceForm').addEventListener('input', updateInvoicePreview);

    // ربط الأزرار بأفعالها البرمجية الآمنة
    document.getElementById('btnSave').addEventListener('click', saveInvoiceToSupabase);
    document.getElementById('btnRefreshDash').addEventListener('click', fetchDashboardData);
    
    document.getElementById('btnPrint').addEventListener('click', () => {
        try { window.print(); } catch (err) { alert(`🛑 فشل فتح نافذة الطباعة: ${err.message}`); }
    });

    document.getElementById('btnWhatsApp').addEventListener('click', () => {
        try {
            const phone = document.getElementById('inputPhone').value.trim();
            const name = document.getElementById('inputName').value;
            const invId = document.getElementById('inputInvId').value;
            const eventDate = document.getElementById('inputEventDate').value;
            const rate = parseFloat(document.getElementById('inputRate').value) || 0;
            const insurance = parseFloat(document.getElementById('inputInsurance').value) || 0;
            const paid = parseFloat(document.getElementById('inputPaid').value) || 0;
            const remaining = (rate + insurance - paid).toFixed(3);
            
            if (!phone) { alert("⚠️ تنبيه: يرجى إدخال رقم واتساب العميل أولاً."); return; }

            const text = `مرحباً بك أخي ${name} في متجر زورة ✨\n\nتم إصدار فاتورة حجز مستلزمات الحفلة الخاصة بكم برقم: ${invId}.\n📅 تاريخ المناسبة: ${eventDate}\n💰 المبلغ المتبقي المستحق هو: ${remaining} ر.ع.\n\nنشكر اختياركم لمتجر زورة وثقتكم بنا 🤍`;
            window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
        } catch (err) { alert(`🛑 فشل الانتقال لتطبيق واتساب: ${err.message}`); }
    });
});
