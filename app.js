// إعداد الاتصال بقاعدة بيانات سوبابيز الخاصة بمتجر زورة
const SUPABASE_URL = "https://nbgqoggilutczmzqxydp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_T1PrZFkblKRTY5GfLoNjMQ_dM5hGAOF";

let supabaseClient;
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("🛑 خطأ: لم يتم تحميل مكتبة سوبابيز الأساسية في المتصفح.");
    }
} catch(e) {
    console.error("❌ خطأ مباغت أثناء تهيئة سوبابيز: ", e);
}

// دالة توليد رقم الفاتورة تلقائياً بدقة تمنع التكرار (Unique Constraint)
function setAutomaticInvoiceId() {
    try {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); 
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const timestamp = now.getTime().toString().slice(-4); // جلب ملي ثواني لمنع التكرار الجذري
        const autoId = `INV-${year}${month}-${timestamp}`;
        
        if(document.getElementById('inputInvId')) document.getElementById('inputInvId').value = autoId;
        if(document.getElementById('viewInvId')) document.getElementById('viewInvId').innerText = autoId;
    } catch (err) {
        console.error("❌ خطأ أثناء توليد رقم الفاتورة التلقائي:", err);
    }
}

// دالة تحديث المعاينة الحية للفاتورة أثناء كتابة البيانات
function updateInvoicePreview() {
    try {
        if (new URLSearchParams(window.location.search).has('inv')) return;

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

// دالة جلب البيانات وعرضها في الإحصائيات وجدول الإدارة
async function fetchDashboardData() {
    if (!supabaseClient || new URLSearchParams(window.location.search).has('inv')) return;
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
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-[#8C7662]">لا توجد فواتير مسجلة حالياً 📥</td></tr>`;
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

// دالة جلب بيانات فاتورة عميل منفردة وعرضها (لوضع العميل PDF المباشر)
async function fetchSingleInvoiceForCustomer(invoiceNumber) {
    if (!supabaseClient) return;
    try {
        let { data: invoices, error } = await supabaseClient
            .from('invoices')
            .select(`
                id, invoice_number, event_date, insurance_amount, 
                subtotal_amount, total_amount, paid_amount,
                customers ( name, phone ),
                invoice_items ( item_description, rate, amount )
            `)
            .eq('invoice_number', invoiceNumber);

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
            alert("🛑 تنبيه: عذراً، لم يتم العثور على الفاتورة المطلوبة بالنظام.");
            return;
        }

        const inv = invoices[0];
        const custName = inv.customers ? inv.customers.name : "-";
        const custPhone = inv.customers ? inv.customers.phone : "-";
        const itemDesc = inv.invoice_items && inv.invoice_items[0] ? inv.invoice_items[0].item_description : "تأجير مستلزمات زورة";
        const itemRate = inv.invoice_items && inv.invoice_items[0] ? inv.invoice_items[0].rate : inv.subtotal_amount;
        const remaining = inv.total_amount - inv.paid_amount;

        document.getElementById('viewName').innerText = custName;
        document.getElementById('viewPhone').innerText = custPhone;
        document.getElementById('viewInvId').innerText = inv.invoice_number;
        document.getElementById('viewEventDate').innerText = inv.event_date || "-";
        document.getElementById('viewDesc').innerText = itemDesc;
        
        document.getElementById('viewRateTable').innerText = itemRate.toFixed(3) + " ر.ع";
        document.getElementById('viewAmountTable').innerText = itemRate.toFixed(3) + " ر.ع";
        document.getElementById('viewSubtotal').innerText = inv.subtotal_amount.toFixed(3) + " ر.ع";
        document.getElementById('viewInsurance').innerText = inv.insurance_amount.toFixed(3) + " ر.ع";
        document.getElementById('viewTotal').innerText = inv.total_amount.toFixed(3) + " ر.ع";
        document.getElementById('viewPaid').innerText = inv.paid_amount.toFixed(3) + " ر.ع";
        document.getElementById('viewRemaining').innerText = remaining.toFixed(3) + " ر.ع";

    } catch (err) {
        console.error("❌ خطأ في جلب الفاتورة الفردية للعميل:", err);
    }
}

// دالة حفظ الفاتورة الجديدة بالكامل في السحاب والـ Database
async function saveInvoiceToSupabase() {
    if (!supabaseClient) {
        alert("🛑 خطأ: لا يمكن إتمام العملية لعدم وجود اتصال نشط بسوبابيز!");
        return;
    }

    const btn = document.getElementById('btnSave');
    if(btn) { btn.innerText = "جاري الحفظ بالسحاب... ⏳"; btn.disabled = true; }

    const name = document.getElementById('inputName').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const invId = document.getElementById('inputInvId').value;
    const eventDate = document.getElementById('inputEventDate').value;
    const desc = document.getElementById('inputDesc').value;
    
    if (!name || !phone) {
        alert("⚠️ خطأ في الإدخال: يرجى تعبئة اسم ورقم هاتف العميل أولاً لحفظ الفاتورة.");
        if(btn) { btn.innerText = "حفظ الفاتورة في السحاب 💾"; btn.disabled = false; }
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

        if (invError) throw new Error(`جدول الفواتير الرئيسي: ${invError.message}`);

        const { error: itemError } = await supabaseClient
            .from('invoice_items')
            .insert({
                invoice_id: invoice.id,
                item_description: desc,
                rate: rate,
                quantity: 1,
                amount: rate
            });

        if (itemError) throw new Error(`تفاصيل عناصر الفاتورة: ${itemError.message}`);

        alert(`🎉 ممتاز! تم حفظ الفاتورة رقم ${invId} بنجاح في قاعدة البيانات.`);
        setAutomaticInvoiceId();
        updateInvoicePreview();
        fetchDashboardData();

    } catch (err) {
        console.error("❌ خطأ شامل في عملية الحفظ بسوبابيز:", err);
        alert(`🛑 حدث خطأ في النظام السحابي:\n${err.message}`);
    } finally {
        if(btn) { btn.innerText = "حفظ الفاتورة في السحاب 💾"; btn.disabled = false; }
    }
}

// دالة إرسال الفاتورة مع رابط الـ PDF للعميل عبر الواتساب (الزر الرئيسي)
function sendWhatsAppWithPDF() {
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

        const invoiceUrl = `https://bugge6304-del.github.io/zorah-billing/?inv=${invId}`;

        const text = `مرحباً بك أخي ${name} في متجر زورة ✨\n\nتم إصدار فاتورة حجز مستلزمات الحفلة الخاصة بكم برقم: ${invId}.\n📅 تاريخ المناسبة: ${eventDate}\n💰 المبلغ المتبقي المستحق هو: ${remaining} ر.ع.\n\n📄 لمشاهدة الفاتورة الرسمية وتحميلها بصيغة PDF اضغط على الرابط التالي:\n${invoiceUrl}\n\nنشكر اختياركم لمتجر زورة وثقتكم بنا 🤍`;
        
        window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    } catch (err) { alert(`🛑 فشل فتح تطبيق الواتساب: ${err.message}`); }
}

// دالة إرسال التنبيهات بالواتساب السريع المباشر من جدول الإحصائيات الداشبورد
function quickWhatsApp(phone, name, invId, eventDate, remaining) {
    try {
        if (!phone) { alert("رقم الهاتف غير متوفر للعميل."); return; }
        
        const invoiceUrl = `https://bugge6304-del.github.io/zorah-billing/?inv=${invId}`;
        
        const text = `مرحباً بك أخي ${name} في متجر زورة ✨\n\nنذكركم بفاتورة حجزكم رقم: ${invId}.\n📅 تاريخ المناسبة: ${eventDate}\n💰 المبلغ المتبقي المستحق هو: ${remaining} ر.ع.\n\n📄 لمعاينة وتحميل الفاتورة الرسمية بصيغة PDF:\n${invoiceUrl}\n\nنشكر اختياركم لمتجر زورة وثقتكم بنا 🤍`;
        window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    } catch (err) { alert("فشل فتح الواتساب السريع: " + err.message); }
}

// دالة فحص الروابط (URL Parameters) والتحقق من وضع الزائر أو العميل
function checkRouteAndRole() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('inv')) {
        const targetInvNumber = urlParams.get('inv');
        
        if(document.getElementById('controlPanel')) document.getElementById('controlPanel').style.display = 'none';
        if(document.getElementById('actionButtons')) document.getElementById('actionButtons').style.display = 'none';
        if(document.getElementById('dashboardPanel')) document.getElementById('dashboardPanel').style.display = 'none';
        
        const previewPanel = document.getElementById('previewPanel');
        if(previewPanel) {
            previewPanel.className = "lg:col-span-12 max-w-3xl mx-auto w-full";
        }
        
        const btnCustomerPrint = document.getElementById('btnCustomerPrint');
        if(btnCustomerPrint) {
            btnCustomerPrint.style.display = 'flex';
            btnCustomerPrint.addEventListener('click', () => { window.print(); });
        }
        
        fetchSingleInvoiceForCustomer(targetInvNumber);
    } else {
        setAutomaticInvoiceId();
        updateInvoicePreview();
        fetchDashboardData();

        const invoiceForm = document.getElementById('invoiceForm');
        if (invoiceForm) invoiceForm.addEventListener('input', updateInvoicePreview);

        const btnSave = document.getElementById('btnSave');
        if (btnSave) btnSave.addEventListener('click', saveInvoiceToSupabase);

        const btnRefreshDash = document.getElementById('btnRefreshDash');
        if (btnRefreshDash) btnRefreshDash.addEventListener('click', fetchDashboardData);

        const btnWhatsApp = document.getElementById('btnWhatsApp');
        if (btnWhatsApp) btnWhatsApp.addEventListener('click', sendWhatsAppWithPDF);
        
        const btnPrint = document.getElementById('btnPrint');
        if (btnPrint) {
            btnPrint.addEventListener('click', () => {
                try { window.print(); } catch (err) { alert(`🛑 فشل فتح نافذة الطباعة: ${err.message}`); }
            });
        }
    }
}

// استخدام الـ Load المباشر والمستقر لضمان التزامن
window.addEventListener('load', () => {
    if (!supabaseClient && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    checkRouteAndRole();
});
